import { performance } from 'node:perf_hooks';
import { logEvent, verboseLog } from '../utils/logger.js';
import { getConfig } from '../utils/config.js';

const RAW_TARGET = Symbol('KEPOIN_RAW_TARGET');
const proxiedMap = new WeakMap();

let callIdCounter = 0;

function isNativeSafe(target) {
  // Try to determine if the object is something that will aggressively crash
  // if proxied, like Promises or Streams. If it has a RAW_TARGET, we unwrap it.
  return true;
}

/**
 * Wraps a target object, class, or function in an ES6 Proxy to passively observe execution.
 *
 * @param {any} target The target to observe
 * @param {string} name The logical name of the target
 * @param {string} [location] The file path or context
 * @returns {any} The Proxied target
 */
export function kepoin(target, name = 'Anonymous', location = 'Unknown') {
  const config = getConfig();
  if (!config.enabled) return target;

  if (target === null || (typeof target !== 'object' && typeof target !== 'function')) {
    return target;
  }

  // Prevent double-proxying
  if (proxiedMap.has(target)) {
    return proxiedMap.get(target);
  }
  
  if (target[RAW_TARGET]) {
    return target;
  }

  const handler = {
    get(obj, prop, receiver) {
      if (prop === RAW_TARGET) return obj;

      // Unwrapping logic for native V8 Internal Slots
      let value;
      try {
        value = Reflect.get(obj, prop, receiver);
      } catch (err) {
        if (err instanceof TypeError && err.message.includes('Incompatible receiver')) {
          // Silent Bypassing: return the native call bound to the raw object
          const rawObj = obj[RAW_TARGET] || obj;
          const rawVal = Reflect.get(rawObj, prop, rawObj);
          if (typeof rawVal === 'function') {
            return rawVal.bind(rawObj);
          }
          return rawVal;
        }
        throw err;
      }

      if (typeof value === 'function') {
        return kepoin(value, `${name}.${prop.toString()}`, location);
      }
      return value;
    },

    apply(obj, thisArg, args) {
      const callId = ++callIdCounter;
      const startTime = performance.now();
      
      if (config.slowThreshold === 0) {
        logEvent({
          callId,
          location,
          target: name,
          status: 'Executing',
          message: `Function call with ${args.length} args`
        });
      }

      try {
        // We use the raw object if we're a proxy to avoid receiver issues in methods
        const rawObj = obj[RAW_TARGET] || obj;
        const rawThis = thisArg && thisArg[RAW_TARGET] ? thisArg[RAW_TARGET] : thisArg;
        
        const result = Reflect.apply(rawObj, rawThis, args);

        if (result instanceof Promise) {
          result.then(
            (res) => {
              const duration = performance.now() - startTime;
              if (duration >= config.slowThreshold) {
                logEvent({
                  callId,
                  location,
                  target: name,
                  status: 'Resolved',
                  duration
                });
              }
              return res;
            },
            (err) => {
              const duration = performance.now() - startTime;
              if (duration >= config.slowThreshold) {
                logEvent({
                  callId,
                  location,
                  target: name,
                  status: 'Failed',
                  duration,
                  error: err ? err.message : 'Unknown Promise Rejection'
                });
              }
              throw err;
            }
          );
        } else {
          const duration = performance.now() - startTime;
          if (duration >= config.slowThreshold) {
            logEvent({
              callId,
              location,
              target: name,
              status: 'Resolved',
              duration
            });
          }
        }
        
        // Wrap the result if it's an object/function
        return kepoin(result, `${name}()`, location);

      } catch (err) {
        const duration = performance.now() - startTime;
        if (duration >= config.slowThreshold) {
          logEvent({
            callId,
            location,
            target: name,
            status: 'Failed',
            duration,
            error: err ? err.message : 'Unknown Synchronous Error'
          });
        }
        throw err;
      }
    },

    construct(obj, args, newTarget) {
      const callId = ++callIdCounter;
      const startTime = performance.now();
      if (config.slowThreshold === 0) {
        logEvent({
          callId,
          location,
          target: name,
          status: 'Executing',
          message: `Constructor call with ${args.length} args`
        });
      }

      try {
        const rawObj = obj[RAW_TARGET] || obj;
        const instance = Reflect.construct(rawObj, args, newTarget);
        
        const duration = performance.now() - startTime;
        if (duration >= config.slowThreshold) {
          logEvent({
            callId,
            location,
            target: name,
            status: 'Resolved',
            duration
          });
        }

        return kepoin(instance, `Instance_${name}`, location);
      } catch (err) {
        const duration = performance.now() - startTime;
        if (duration >= config.slowThreshold) {
          logEvent({
            callId,
            location,
            target: name,
            status: 'Failed',
            duration,
            error: err ? err.message : 'Unknown Constructor Error'
          });
        }
        throw err;
      }
    }
  };

  const proxy = new Proxy(target, handler);
  proxiedMap.set(target, proxy);
  verboseLog(`Created Proxy for target: ${name} at ${location}`);
  return proxy;
}
