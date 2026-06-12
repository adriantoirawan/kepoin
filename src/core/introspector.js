import inspector from 'node:inspector';
import { emergencySyncFlush } from '../utils/logger.js';
import { getConfig } from '../utils/config.js';

let session = null;
let installed = false;

function extractLocalVariables(properties) {
  const localVars = {};
  for (const prop of properties) {
    if (!prop.enumerable && prop.name !== 'this') continue;
    
    if (prop.value) {
      if (prop.value.type === 'object' || prop.value.type === 'function') {
        // Truncate arrays and objects to their description (e.g. "Array(100)", "Object")
        let desc = prop.value.description || prop.value.className;
        // Apply Bandwidth Optimization Mandate visually
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

export function initIntrospector() {
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

      // Find the local scope
      const localScope = topFrame.scopeChain.find(s => s.type === 'local');
      
      let localVars = {};
      if (localScope && localScope.object && localScope.object.objectId) {
        // Evaluate shallow properties of the local scope
        session.post('Runtime.getProperties', {
          objectId: localScope.object.objectId,
          ownProperties: true
        }, (err, props) => {
          if (!err && props.result) {
            localVars = extractLocalVariables(props.result);
          }
          finishCrash(topFrame, data, localVars);
        });
      } else {
        finishCrash(topFrame, data, localVars);
      }
    });

    installed = true;
  } catch (err) {
    // If inspector fails to connect (e.g., port in use), fallback silently
    if (config.verbose) {
      console.error(`\x1b[90m[kepoin:introspector]\x1b[0m Failed to attach inspector: ${err.message}. Falling back to standard hooks.`);
    }
    installFallbackHooks();
  }
}

function finishCrash(topFrame, exceptionData, localVars) {
  const errorObj = exceptionData && exceptionData.description ? exceptionData.description : 'Unknown Error';
  
  const payload = {
    incidentLocation: topFrame.url ? `${topFrame.url}:${topFrame.location.lineNumber + 1}` : 'Unknown',
    errorMessage: errorObj.split('\n')[0],
    errorStack: errorObj,
    localVariables: localVars,
    timestamp: new Date().toISOString()
  };

  emergencySyncFlush(payload);
  process.exit(1);
}

function handleFallbackCrash(error) {
  const payload = {
    incidentLocation: 'Unknown',
    errorMessage: error ? error.message : 'Unknown Error',
    errorStack: error ? error.stack : undefined,
    localVariables: { _warning: 'Inspector unavailable. Local scope could not be captured.' },
    timestamp: new Date().toISOString()
  };
  emergencySyncFlush(payload);
  process.exit(1);
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
