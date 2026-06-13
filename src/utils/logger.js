import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from './config.js';
import { sanitize } from '../core/sanitizer.js';

let writeStream = null;
let resolvedOutFile = null;

let totalCalls = 0;
let totalErrors = 0;
const errorSummary = [];
let hasPrintedSummary = false;

process.on('exit', () => {
  const config = getConfig();
  if (!config.enabled || totalCalls === 0 || hasPrintedSummary) return;
  hasPrintedSummary = true;

  console.log('\n \x1b[46m\x1b[37m 🏁 KEPOIN POST-FLIGHT SUMMARY \x1b[0m\n');
  console.log(' \x1b[1m📊 Metrics:\x1b[0m');
  console.log(`    Total Intercepted Calls : ${totalCalls}`);
  console.log(`    Caught Exceptions       : ${totalErrors}\n`);

  if (errorSummary.length > 0) {
    console.log(' \x1b[33m⚠️  Exceptions Caught (Top 50):\x1b[0m');
    errorSummary.forEach(err => {
      console.log(`    \x1b[36m[#${err.callId}]\x1b[0m ${err.target}`);
      console.log(`         ➔ ${err.error} (Occurred at: ${err.timestamp})`);
    });

    console.log('\n    \x1b[33m💡 [TIP]\x1b[0m The terminal summary is capped at 50 exceptions to protect memory.');
    if (totalErrors > 50) {
      console.log(`    ${totalErrors - 50} additional exceptions were not saved.`);
    }
    console.log('    Use the --out=<file> flag to persistently stream all logs to disk.');
  }
  console.log('\n------------------------------------------------\n');
});

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
  const { callId, location, status, message, duration, target, error } = payload;
  const timeStr = duration ? ` (+${duration.toFixed(2)}ms)` : '';
  
  const shortTime = payload.timestamp ? payload.timestamp.split('T')[1].replace('Z', '') : '';
  
  const idPrefix = callId ? `\x1b[36m[#${callId}]\x1b[0m ` : '';
  let prefix = `\x1b[90m${shortTime} │\x1b[0m ${idPrefix}[${location || 'unknown'}] `;
  if (status === 'Executing') {
    prefix += `\x1b[36m▶ Executing:\x1b[0m ${target}`;
  } else if (status === 'Resolved') {
    prefix += `\x1b[32m✔ Resolved:\x1b[0m  ${target}${timeStr}`;
  } else if (status === 'Failed') {
    prefix += `\x1b[31m✖ Failed:\x1b[0m    ${target}${timeStr} - ${error || message}`;
  } else {
    prefix += `[${status}] ${message || ''}`;
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

  payload.timestamp = new Date().toISOString();

  if (payload.status === 'Executing') {
    totalCalls++;
  } else if (payload.status === 'Failed') {
    totalErrors++;
    if (errorSummary.length < 50) {
      errorSummary.push(payload);
    }
  }

  // Pass payload through the dynamic redaction engine
  const safePayload = sanitize(payload);

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
    
    if (safePayload.localVariables) {
      console.error('\n--- Local Variable Scope (V8 Lexical Autopsy) ---');
      for (const [varName, value] of Object.entries(safePayload.localVariables)) {
        console.error(`${varName.padEnd(20)} ➔ ${value}`);
      }
    }

    console.error('\n--- Active Local Module Cache State ---');
    
    if (safePayload.cacheDump) {
      for (const [modPath, details] of Object.entries(safePayload.cacheDump)) {
        console.error(`${path.basename(modPath).padEnd(20)} ➔ [${details.type}] Static properties: ${JSON.stringify(details.staticProps)}, Instance methods: ${JSON.stringify(details.instanceMethods)}`);
      }
    }
    console.error('------------------------------------------------\n');
  }
}
