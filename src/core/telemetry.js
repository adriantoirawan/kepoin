import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logEvent, verboseLog, extractSourceSnippet } from '../utils/logger.js';
import { getConfig } from '../utils/config.js';

const RAW_TARGET = Symbol('KEPOIN_RAW_TARGET');
const proxiedMap = new WeakMap();

let callIdCounter = 0;

function isNativeSafe(target) {
  // Try to determine if the object is something that will aggressively crash
  // if proxied, like Promises or Streams. If it has a RAW_TARGET, we unwrap it.
  return true;
}

function extractCallerInfo(stackObj) {
  const stack = stackObj ? stackObj.stack : new Error().stack;
  if (!stack) return null;
  const lines = stack.split('\n');
  let targetLine = null;
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].includes('kepoin/src/core/telemetry.js') && !lines[i].includes('kepoin/src/utils/logger.js')) {
      targetLine = lines[i];
      break;
    }
  }
  if (!targetLine) return null;

  const match = targetLine.match(/at (?:(.+?)\s+\()?(?:file:\/\/\/)?(.+?):(\d+):\d+\)?/);
  if (match) {
    const funcName = match[1] || 'Anonymous';
    const filePath = match[2];
    const lineNumber = parseInt(match[3], 10);
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop();
    return { name: funcName, file: filePath, line: lineNumber, formatted: `${funcName} in ${fileName}:${lineNumber}` };
  }
  return null;
}

/**
 * Safely stringifies an argument value with a strict length limit.
 */
function safeStringify(val) {
  try {
    const str = JSON.stringify(val);
    if (str && str.length > 50) return str.substring(0, 50) + '...';
    return str || 'undefined';
  } catch (err) {
    return '[Unserializable]';
  }
}

/**
 * Formats a list of arguments into a clean multi-line breakdown with types.
 * @param {Array} args The arguments array.
 * @returns {string} The formatted arguments breakdown.
 */
function formatArguments(args) {
  if (!args || args.length === 0) return 'None';
  return args.map((arg, idx) => {
    let type = typeof arg;
    if (Array.isArray(arg)) type = 'Array';
    if (arg === null) type = 'null';
    return `• arg${idx + 1} (${type}) : ${safeStringify(arg)}`;
  }).join('\n');
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

  let sanitizedLocation = location;
  if (typeof location === 'string' && location.startsWith('file://')) {
    try {
      sanitizedLocation = './' + path.relative(process.cwd(), fileURLToPath(location));
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

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
        return kepoin(value, `${name}.${prop.toString()}`, sanitizedLocation);
      }
      return kepoin(value, `${name}.${prop.toString()}`, sanitizedLocation);
    },

    apply(fn, thisArg, args) {
      const callId = ++callIdCounter;
      const startTime = performance.now();
      
      verboseLog(`[telemetry] Intercepted call to ${name}`);
      const callerInfo = extractCallerInfo();
      
      if (config.slowThreshold === 0) {
        logEvent({
          callId,
          location: sanitizedLocation,
          target: name,
          status: 'Executing',
          caller: callerInfo ? callerInfo.formatted : null,
          message: `Function call with ${args.length} args`
        });
      }

      try {
        // We use the raw object if we're a proxy to avoid receiver issues in methods
        const rawObj = fn[RAW_TARGET] || fn;
        const rawThis = thisArg && thisArg[RAW_TARGET] ? thisArg[RAW_TARGET] : thisArg;
        
        const result = Reflect.apply(rawObj, rawThis, args);

        if (result instanceof Promise) {
          result.then(
            (res) => {
              const duration = performance.now() - startTime;
              if (duration >= config.slowThreshold) {
                logEvent({
                  callId,
                  location: sanitizedLocation,
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
                const errCaller = extractCallerInfo(err);
                const snippet = errCaller ? extractSourceSnippet(errCaller.file, errCaller.line) : null;
                const argsDump = formatArguments(args);
                
                logEvent({
                  callId,
                  location: sanitizedLocation,
                  target: name,
                  status: 'Failed',
                  duration,
                  argsDump,
                  sourceSnippet: snippet,
                  error: err ? err.toString() : 'Unknown Promise Rejection',
                  stack: err ? err.stack : undefined
                });
              }
              // Do not rethrow here, we are just side-effecting. The original promise throws to the user.
            }
          ).catch(() => {});
        } else {
          const duration = performance.now() - startTime;
          if (duration >= config.slowThreshold) {
            logEvent({
              callId,
              location: sanitizedLocation,
              target: name,
              status: 'Resolved',
              duration
            });
          }
        }
        
        // Wrap the result if it's an object/function
        return kepoin(result, `${name}()`, sanitizedLocation);

      } catch (err) {
        const duration = performance.now() - startTime;
        if (duration >= config.slowThreshold) {
          const errCaller = extractCallerInfo(err);
          const snippet = errCaller ? extractSourceSnippet(errCaller.file, errCaller.line) : null;
          const argsDump = formatArguments(args);

          logEvent({
            callId,
            location: sanitizedLocation,
            target: name,
            status: 'Failed',
            duration,
            argsDump,
            sourceSnippet: snippet,
            error: err ? err.toString() : 'Unknown Error',
            stack: err ? err.stack : undefined
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
            error: err ? err.message : 'Unknown Constructor Error',
            stack: err ? err.stack : undefined
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
