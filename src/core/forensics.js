import { getConfig } from '../utils/config.js';
import { emergencySyncFlush } from '../utils/logger.js';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let installed = false;

function buildCacheDump() {
  const dump = {};
  
  for (const [modPath, modCache] of Object.entries(require.cache)) {
    // Exclude core and node_modules to keep autopsy fast and readable
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

function handleCrash(error, incidentLocationStr) {
  const config = getConfig();
  if (!config.enabled) {
    process.exit(1);
    return;
  }

  const payload = {
    incidentLocation: incidentLocationStr || 'Unknown',
    errorMessage: error ? error.message : 'Unknown Error',
    errorStack: error ? error.stack : undefined,
    cacheDump: buildCacheDump(),
    timestamp: new Date().toISOString()
  };

  emergencySyncFlush(payload);
  
  // Must exit after uncaught crash
  process.exit(1);
}

/**
 * Initializes the Forensic Autopsy Engine.
 */
export function initForensics() {
  const config = getConfig();
  if (!config.enabled || installed) return;

  // We can't determine the exact function that failed easily from here, 
  // but we provide the error message and the cache dump.
  process.on('uncaughtException', (error) => {
    handleCrash(error, 'uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    handleCrash(error, 'unhandledRejection');
  });

  installed = true;
}
