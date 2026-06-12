import Module from 'node:module';
import path from 'node:path';
import { kepoin } from '../core/telemetry.js';
import { initForensics } from '../core/forensics.js';
import { getConfig } from '../utils/config.js';

const originalRequire = Module.prototype.require;

function shouldProxy(id) {
  // Smart Safety Filters: Bypasses native V8 built-ins and node_modules
  if (id.startsWith('node:')) return false;
  if (id.includes('node_modules')) return false;
  
  // We generally only want to proxy user-space code. 
  // If it's an absolute or relative path, it's likely user code.
  if (path.isAbsolute(id) || id.startsWith('.')) {
    return true;
  }
  
  return false;
}

/**
 * Overrides CommonJS require to natively intercept and wrap modules.
 */
Module.prototype.require = function(id) {
  const exportsObj = originalRequire.apply(this, arguments);

  const config = getConfig();
  if (!config.enabled) {
    return exportsObj;
  }

  // Determine actual file path for location
  let resolvedPath = id;
  try {
    resolvedPath = Module._resolveFilename(id, this);
  } catch (e) {
    // Ignore resolve errors
  }

  if (shouldProxy(resolvedPath)) {
    const modName = path.basename(resolvedPath);
    return kepoin(exportsObj, modName, resolvedPath);
  }

  return exportsObj;
};

// Initialize the crash handlers
initForensics();
