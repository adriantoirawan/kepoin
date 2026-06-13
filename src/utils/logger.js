import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from './config.js';
import { sanitize } from '../core/sanitizer.js';

let jsonStream = null;
let spillStream = null;
let resolvedLogFile = null;
let resolvedSpillFile = null;
let activeDateStr = null;

let totalCalls = 0;
let totalErrors = 0;
const errorSummary = [];
let hasPrintedSummary = false;

// Adaptive Gutter State Machine
let printCounter = 0;
let currentGear = 1;
const startupDate = new Date();
let lastMillisStr = '';
let millisCounter = 1;

/**
 * Strips ANSI color codes for pristine .spil output
 */
function stripAnsi(string) {
  return string.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Initializes or rotates log streams based on the current date.
 */
function initLogger(now = new Date()) {
  const config = getConfig();
  if (!config.enabled) return;

  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  activeDateStr = dateStr;

  // Safely close existing streams during rotation
  if (jsonStream) jsonStream.end();
  if (spillStream) spillStream.end();

  if (config.logDir) {
    try {
      fs.mkdirSync(config.logDir, { recursive: true });
    } catch(e) {}
    resolvedLogFile = path.join(config.logDir, `telemetry-${dateStr}.jsonl`);
    jsonStream = fs.createWriteStream(resolvedLogFile, { flags: 'a' });
  }

  if (config.spillDir) {
    try {
      fs.mkdirSync(config.spillDir, { recursive: true });
    } catch(e) {}
    resolvedSpillFile = path.join(config.spillDir, `execution-${dateStr}.spil`);
    spillStream = fs.createWriteStream(resolvedSpillFile, { flags: 'a' });
  }
}

/**
 * Generates the Adaptive Gutter string and shifts Gears automatically.
 */
function generateGutter(now) {
  printCounter++;

  // Detect Gear Shifts
  if (now.getFullYear() !== startupDate.getFullYear()) {
    if (currentGear < 4) {
      console.log('\n  \x1b[35m✨ [kepoin:ui] Happy New Year! Telemetry scaling to Multi-Year Epoch (Gear 4)\x1b[0m\n');
      currentGear = 4;
    }
  } else if (now.getDate() !== startupDate.getDate() || now.getMonth() !== startupDate.getMonth()) {
    if (currentGear < 3) {
      console.log('\n  \x1b[35m✨ [kepoin:ui] Midnight crossed. Telemetry scaling to Multi-Day Forensics (Gear 3)\x1b[0m\n');
      currentGear = 3;
    }
  } else if (printCounter > 999 && currentGear === 1) {
    console.log('\n  \x1b[35m✨ [kepoin:ui] High volume detected. Telemetry scaling to Precise Time (Gear 2)\x1b[0m\n');
    currentGear = 2;
  }

  // Gear 1: Minimalist
  if (currentGear === 1) {
    return String(printCounter).padStart(3, '0') + ' │';
  }

  // Formatting Time & Sub-Milliseconds
  const timeStr = now.toISOString().split('T')[1].replace('Z', '');
  if (timeStr === lastMillisStr) {
    millisCounter++;
  } else {
    millisCounter = 1;
    lastMillisStr = timeStr;
  }
  const millisExt = String(millisCounter).padStart(3, '0');
  
  // Format Date prefixes for Gear 3 & 4
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const datePrefix = `${monthNames[now.getMonth()]}-${String(now.getDate()).padStart(2, '0')}`;
  
  if (currentGear === 2) {
    return `${timeStr}:${millisExt} │`;
  } else if (currentGear === 3) {
    return `${datePrefix} ${timeStr}:${millisExt} │`;
  } else {
    return `${now.getFullYear()} ${datePrefix} ${timeStr}:${millisExt} │`;
  }
}

process.on('beforeExit', () => {
  if (jsonStream) {
    jsonStream.end();
  }
  if (spillStream) {
    spillStream.end();
  }
});

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
      console.log(`         ➔ ${err.error || err.message}`);
      
      // Context-Aware UI Summary
      console.log(`            • Console Trace   : ${stripAnsi(err.consoleTrace).replace(' │', '')}`);
      if (config.spillDir && resolvedSpillFile) {
        console.log(`            • Human Spill     : ${path.basename(resolvedSpillFile)}`);
      }
      if (config.logDir && resolvedLogFile) {
        console.log(`            • APM Log         : ${path.basename(resolvedLogFile)}`);
      }
      console.log(`            • Telemetry Query : "${err.timestamp}"`);
    });

    console.log('\n    \x1b[33m💡 [TIP]\x1b[0m The terminal summary is capped at 50 exceptions to protect memory.');
    if (totalErrors > 50) {
      console.log(`    ${totalErrors - 50} additional exceptions were not saved.`);
    }
    console.log('    Use --log-dir and --spill-dir to persistently stream traces to disk.');
  }
  console.log('\n------------------------------------------------\n');
});

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
 * Formats a payload for ANSI terminal output using the injected Gutter.
 */
function formatAnsi(payload) {
  const { callId, location, status, message, duration, target, error, consoleTrace } = payload;
  const timeStr = duration ? ` (+${duration.toFixed(2)}ms)` : '';
  
  const idPrefix = callId ? `\x1b[36m[#${callId}]\x1b[0m ` : '';
  let prefix = `\x1b[90m${consoleTrace}\x1b[0m ${idPrefix}[${location || 'unknown'}] `;
  
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
 * Asynchronously logs telemetry data and handles log rotation.
 */
export function logEvent(payload) {
  const config = getConfig();
  if (!config.enabled) return;

  const now = new Date();
  payload.timestamp = now.toISOString();
  
  const dateStr = payload.timestamp.split('T')[0];

  // Initialize streams or perform Midnight Rotation
  if ((config.logDir || config.spillDir) && activeDateStr !== dateStr) {
    initLogger(now);
  }

  // Adaptive Gutter Injection
  payload.consoleTrace = generateGutter(now);

  if (payload.status === 'Executing') {
    totalCalls++;
  } else if (payload.status === 'Failed') {
    totalErrors++;
    if (errorSummary.length < 50) {
      errorSummary.push(payload);
    }
  }

  const safePayload = sanitize(payload);
  const formattedString = formatAnsi(safePayload);

  if (jsonStream) {
    jsonStream.write(JSON.stringify(safePayload) + '\n');
  }
  
  if (spillStream) {
    spillStream.write(stripAnsi(formattedString) + '\n');
  }

  // Terminal Output
  if (config.format === 'ansi') {
    console.log(formattedString);
  } else if (!jsonStream) {
    // Only dump JSON to console if they didn't ask for a file and explicitly asked for json format
    console.log(JSON.stringify(safePayload));
  }
}

/**
 * Synchronously flushes data to disk during a fatal crash.
 */
export function emergencySyncFlush(payload) {
  const config = getConfig();
  if (!config.enabled) return;
  
  const now = new Date();
  payload.timestamp = now.toISOString();
  const dateStr = payload.timestamp.split('T')[0];

  if ((config.logDir || config.spillDir) && activeDateStr !== dateStr) {
    initLogger(now);
  }

  payload.consoleTrace = generateGutter(now);
  const safePayload = sanitize(payload, 6);
  const formattedString = formatAnsi(safePayload);

  if (resolvedLogFile) {
    try {
      fs.appendFileSync(resolvedLogFile, JSON.stringify(safePayload) + '\n');
    } catch (e) {}
  }
  if (resolvedSpillFile) {
    try {
      fs.appendFileSync(resolvedSpillFile, stripAnsi(formattedString) + '\n');
    } catch (e) {}
  }
  
  if (!resolvedLogFile && !resolvedSpillFile) {
    // Terminal autopsy if no output directories were provided
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
        console.error(`${path.basename(modPath).padEnd(20)} ➔ [${details.type}] Static: ${JSON.stringify(details.staticProps)}, Inst: ${JSON.stringify(details.instanceMethods)}`);
      }
    }
    console.error('------------------------------------------------\n');
  }
}
