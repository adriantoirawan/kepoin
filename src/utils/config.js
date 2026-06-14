import fs from 'node:fs';
import path from 'node:path';

/**
 * Parses configuration from kepoin.json and environment variables.
 * Designed to run synchronously once at startup to avoid blocking the event loop later.
 */

const DEFAULT_REDACT_KEYS = [
  'password',
  'token',
  'secret',
  'authorization',
  'stripe_key',
  'api_key',
  'access_token'
];

let configCache = null;

export function getConfig() {
  if (configCache) return configCache;

  let fileConfig = {};
  try {
    const configPath = path.join(process.cwd(), 'kepoin.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      fileConfig = JSON.parse(raw);
    }
  } catch (e) {
    // Notify the user if their kepoin.json is corrupted
    console.warn('\x1b[33m[kepoin:warning]\x1b[0m kepoin.json contains invalid JSON and was ignored.');
  }

  const env = process.env;

  const enabled = env.KEPOIN_ENABLED !== 'false' && fileConfig.enabled !== false;
  const verbose = env.KEPOIN_VERBOSE === 'true' || fileConfig.verbose === true;
  const logDir = env.KEPOIN_LOG_DIR || fileConfig.logDir || null;
  const spillDir = env.KEPOIN_SPILL_DIR || fileConfig.spillDir || null;
  const format = env.KEPOIN_FORMAT || fileConfig.format || 'ansi';
  const maxDepth = parseInt(env.KEPOIN_MAX_DEPTH, 10) || fileConfig.maxDepth || 4;
  const slowThreshold = parseInt(env.KEPOIN_SLOW_THRESHOLD, 10) || fileConfig.slowThreshold || 0;
  const showTracingFaults = env.KEPOIN_SHOW_TRACING_FAULTS === 'true' || fileConfig.showTracingFaults === true;
  
  const wsPort = parseInt(env.KEPOIN_WS_PORT, 10) || fileConfig.wsPort || 54321;
  
  let customRedactKeys = Array.isArray(fileConfig.redactKeys) ? fileConfig.redactKeys : [];
  if (env.KEPOIN_REDACT_KEYS) {
    customRedactKeys = customRedactKeys.concat(env.KEPOIN_REDACT_KEYS.split(',').map(k => k.trim()));
  }

  // Ensure O(1) Set lookup and case-insensitive normalization
  const redactKeys = new Set([...DEFAULT_REDACT_KEYS, ...customRedactKeys].map(k => k.toLowerCase()));

  configCache = {
    enabled,
    verbose,
    logDir,
    spillDir,
    format,
    maxDepth,
    slowThreshold,
    wsPort,
    redactKeys,
    showTracingFaults
  };

  return configCache;
}
