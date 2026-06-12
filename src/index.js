import { kepoin as coreKepoin } from './core/telemetry.js';
import { getConfig } from './utils/config.js';
import { initForensics } from './core/forensics.js';

// Initialize forensics if we are imported natively (not via loader)
initForensics();

/**
 * Surgical manual wrapper for tracking specific instances or functions.
 */
export function kepoin(target, name, location) {
  const config = getConfig();
  if (!config.enabled) return target;
  return coreKepoin(target, name, location);
}

// Ensure the kill switch logic runs at startup
getConfig();