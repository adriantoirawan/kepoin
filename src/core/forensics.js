import inspector from 'node:inspector';
import path from 'node:path';
import { createRequire } from 'node:module';
import { getConfig } from '../utils/config.js';
import { emergencySyncFlush } from '../utils/logger.js';

const require = createRequire(import.meta.url);

let installed = false;
let session = null;

function buildCacheDump() {
  const dump = {};
  
  for (const [modPath, modCache] of Object.entries(require.cache)) {
    if (modPath.includes('node_modules') || !path.isAbsolute(modPath)) continue;

    const exportsObj = modCache.exports;
    
    let type = typeof exportsObj;
    if (exportsObj === null) type = 'null';
    else if (Array.isArray(exportsObj)) type = 'Array';
    else if (type === 'object') {
      type = Object.getPrototypeOf(exportsObj) === Object.prototype ? 'Object Object' : 'Class/Object';
    } else if (type === 'function') {
      type = 'Class/Function';
    }

    const staticProps = [];
    const instanceMethods = [];

    if (exportsObj && (typeof exportsObj === 'object' || typeof exportsObj === 'function')) {
      for (const key of Object.getOwnPropertyNames(exportsObj)) {
        if (!['length', 'name', 'prototype'].includes(key)) {
          staticProps.push(key);
        }
      }
    }

    if (exportsObj && typeof exportsObj === 'function' && exportsObj.prototype) {
      for (const key of Object.getOwnPropertyNames(exportsObj.prototype)) {
        if (key !== 'constructor') {
          instanceMethods.push(key);
        }
      }
    }

    dump[modPath] = {
      type,
      staticProps,
      instanceMethods
    };
  }

  return dump;
}

function extractLocalVariables(properties) {
  const localVars = {};
  for (const prop of properties) {
    if (!prop.enumerable && prop.name !== 'this') continue;
    
    if (prop.value) {
      if (prop.value.type === 'object' || prop.value.type === 'function') {
        let desc = prop.value.description || prop.value.className;
        if (prop.value.subtype === 'array') {
          const match = desc.match(/Array\(([0-9]+)\)/);
          if (match && parseInt(match[1], 10) > 50) {
            desc = `[Truncated Array: ${match[1]} items]`;
          }
        }
        localVars[prop.name] = desc;
      } else {
        localVars[prop.name] = prop.value.value;
      }
    } else {
      localVars[prop.name] = undefined;
    }
  }
  return localVars;
}

function extractTopCallsite(stack) {
  if (!stack) return 'Unknown Location';
  const lines = stack.split('\n');
  for (const line of lines) {
    if (line.includes('at ') && !line.includes('node:internal') && !line.includes('kepoin/src/')) {
      const match = line.match(/at\s+(.*)\s+\((.*)\)/) || line.match(/at\s+(.*)/);
      if (match) {
        return line.trim().replace(/^at\s+/, '');
      }
    }
  }
  return 'Unknown Location';
}

function finishCrash(incidentLocation, errorMessage, errorStack, localVars) {
  const payload = {
    incidentLocation: incidentLocation || 'Unknown',
    errorMessage: errorMessage || 'Unknown Error',
    errorStack: errorStack,
    localVariables: localVars,
    cacheDump: buildCacheDump(),
    timestamp: new Date().toISOString()
  };

  emergencySyncFlush(payload);
  process.exit(1);
}

function handleFallbackCrash(error) {
  const incidentLocation = extractTopCallsite(error ? error.stack : '');
  const errorMessage = error ? error.message : 'Unknown Error';
  finishCrash(incidentLocation, errorMessage, error ? error.stack : undefined, { _warning: 'Inspector unavailable. Local scope could not be captured.' });
}

export function initForensics() {
  const config = getConfig();
  if (!config.enabled || installed) return;

  try {
    session = new inspector.Session();
    session.connect();

    session.post('Debugger.enable', () => {
      session.post('Debugger.setPauseOnExceptions', { state: 'uncaught' });
    });

    session.on('Debugger.paused', (message) => {
      const { callFrames, reason, data } = message.params;
      
      if (reason !== 'exception' && reason !== 'promiseRejection') return;

      const topFrame = callFrames[0];
      if (!topFrame) {
        handleFallbackCrash(data);
        return;
      }

      const localScope = topFrame.scopeChain.find(s => s.type === 'local');
      let localVars = {};
      
      const errorObj = data && data.description ? data.description : 'Unknown Error';
      const errorMessage = errorObj.split('\n')[0];
      const incidentLocation = topFrame.url ? `${topFrame.url.replace('file://', '')}:${topFrame.location.lineNumber + 1}` : extractTopCallsite(errorObj);

      if (localScope && localScope.object && localScope.object.objectId) {
        session.post('Runtime.getProperties', {
          objectId: localScope.object.objectId,
          ownProperties: true
        }, (err, props) => {
          if (!err && props.result) {
            localVars = extractLocalVariables(props.result);
          }
          finishCrash(incidentLocation, errorMessage, errorObj, localVars);
        });
      } else {
        finishCrash(incidentLocation, errorMessage, errorObj, localVars);
      }
    });

    installed = true;
  } catch (err) {
    if (config.verbose) {
      console.error(`\x1b[90m[kepoin:forensics]\x1b[0m Failed to attach inspector: ${err.message}. Falling back to standard hooks.`);
    }
    installFallbackHooks();
  }
}

function installFallbackHooks() {
  process.on('uncaughtException', (error) => {
    handleFallbackCrash(error);
  });
  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    handleFallbackCrash(error);
  });
  installed = true;
}
