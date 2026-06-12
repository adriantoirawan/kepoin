import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { getConfig } from './config.js';
import { sanitize } from '../core/sanitizer.js';

let writeStream = null;
let resolvedOutFile = null;

function initLogger() {
  const config = getConfig();
  if (!config.enabled) return;

  if (config.outFile && !writeStream) {
    const ext = path.extname(config.outFile);
    const base = path.basename(config.outFile, ext);
    const dir = path.dirname(config.outFile);
    
    // Append PID to prevent file-locking collisions in clustered environments
    resolvedOutFile = path.join(dir, `${base}-${process.pid}${ext}`);
    
    // Ensure directory exists
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch(e) {}

    writeStream = fs.createWriteStream(resolvedOutFile, { flags: 'a' });
  }
}

/**
 * Diagnostic internal logging, enabled via --verbose.
 */
export function verboseLog(message) {
  const config = getConfig();
  if (config.verbose) {
    console.error(`\x1b[90m[kepoin:verbose]\x1b[0m ${message}`);
  }
}

/**
 * Formats a payload for ANSI terminal output.
 */
function formatAnsi(payload) {
  const { location, status, message, duration, target, error } = payload;
  const timeStr = duration ? ` (+${duration.toFixed(2)}ms)` : '';
  
  let prefix = `[${location}] `;
  if (status === 'Executing') {
    prefix += `\x1b[36m▶ Executing:\x1b[0m ${target}`;
  } else if (status === 'Resolved') {
    prefix += `\x1b[32m✔ Resolved:\x1b[0m  ${target}${timeStr}`;
  } else if (status === 'Failed') {
    prefix += `\x1b[31m✖ Failed:\x1b[0m    ${target}${timeStr} - ${error || message}`;
  } else {
    prefix += `[${status}] ${message}`;
  }

  return prefix;
}

/**
 * Asynchronously logs telemetry data.
 * Does not block the V8 event loop.
 */
export function logEvent(payload) {
  const config = getConfig();
  if (!config.enabled) return;

  if (!writeStream && config.outFile) {
    initLogger();
  }

  // Pass payload through the dynamic redaction engine
  const safePayload = sanitize(payload);

  if (config.isHeadless) {
    if (process.send) {
      const payloadStr = JSON.stringify(safePayload);
      if (payloadStr.length > 50000) {
        const compressed = zlib.deflateSync(payloadStr).toString('base64');
        process.send({
          type: 'kepoin:compressed',
          originalType: 'kepoin:telemetry',
          encoding: 'deflate',
          data: compressed
        });
      } else {
        process.send({ type: 'kepoin:telemetry', payload: safePayload });
      }
    }
    // Strict bypass: Never print to stdout in headless mode
    return;
  }

  if (writeStream) {
    // Pipe as NDJSON
    const jsonl = JSON.stringify(safePayload) + '\n';
    writeStream.write(jsonl);
  } else if (config.format === 'ansi') {
    // Pipe to standard output with colors
    console.log(formatAnsi(safePayload));
  } else {
    // Fallback JSON to stdout
    console.log(JSON.stringify(safePayload));
  }
}

/**
 * Synchronously flushes data to disk during a fatal crash.
 */
export function emergencySyncFlush(payload) {
  const config = getConfig();
  if (!config.enabled) return;
  
  if (!resolvedOutFile && config.outFile) {
    initLogger();
  }

  const safePayload = sanitize(payload, 6); // Hardcode deeper depth for autopsies

  if (config.isHeadless) {
    if (process.send) {
      const payloadStr = JSON.stringify(safePayload);
      if (payloadStr.length > 50000) {
        const compressed = zlib.deflateSync(payloadStr).toString('base64');
        process.send({
          type: 'kepoin:compressed',
          originalType: 'kepoin:crash',
          encoding: 'deflate',
          data: compressed
        });
      } else {
        process.send({ type: 'kepoin:crash', payload: safePayload });
      }
    }
    return;
  }

  if (resolvedOutFile) {
    const jsonl = JSON.stringify(safePayload) + '\n';
    try {
      // Emergency synchronous append
      fs.appendFileSync(resolvedOutFile, jsonl);
    } catch (e) {
      // Absolute fallback if file write fails during crash
      console.error(jsonl);
    }
  } else {
    // Terminal autopsy
    console.error('\n \x1b[41m\x1b[37m 🔍 TELEMETRY FORENSIC AUTOPSY REPORT \x1b[0m');
    console.error(`\x1b[31m💥 Incident Location:\x1b[0m ${safePayload.incidentLocation || 'Unknown'}`);
    console.error(`\x1b[31m💥 Error Message:\x1b[0m     ${safePayload.errorMessage || 'Unknown'}`);
    console.error('\n--- Active Local Module Cache State ---');
    
    if (safePayload.cacheDump) {
      for (const [modPath, details] of Object.entries(safePayload.cacheDump)) {
        console.error(`${path.basename(modPath).padEnd(20)} ➔ [${details.type}] Static properties: ${JSON.stringify(details.staticProps)}, Instance methods: ${JSON.stringify(details.instanceMethods)}`);
      }
    }
    console.error('------------------------------------------------\n');
  }
}
