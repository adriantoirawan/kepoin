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
let totalAppExceptions = 0;
let totalEngineFaults = 0;
const errorSummary = [];
let hasPrintedSummary = false;

// Adaptive Gutter State Machine
let printCounter = 0;
let currentGear = 1;
const startupDate = new Date();
let lastMillisStr = '';
let millisCounter = 1;

let hasPrintedLegend = false;

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
  console.log(`    App Exceptions          : ${totalAppExceptions}`);
  console.log(`    Kepoin Faults           : ${totalEngineFaults}\n`);

  if (errorSummary.length > 0) {
    const appExceptions = errorSummary; // errorSummary only contains app exceptions now
    
    const printExceptionList = (list) => {
      // Sort chronologically by invocation
      list.sort((a, b) => a.callId - b.callId);
      
      list.forEach(err => {
        const traceGutter = stripAnsi(err.consoleTrace).replace(' │', '');
        console.log(`    \x1b[90m${traceGutter} │\x1b[0m \x1b[36m[#${err.callId}]\x1b[0m \x1b[1m${err.target}\x1b[0m`);
        
        const wrappedError = wrapText(err.error || err.message, 80, '         ➔ ');
        console.log(`      ➔ \x1b[31m${wrappedError}\x1b[0m`);
        
        if (err.argsDump) {
          console.log(`        \x1b[33mValues passed to function:\x1b[0m`);
          const argLines = err.argsDump.split('\n');
          argLines.forEach(line => console.log(`          ${line}`));
        }
        
        // Context-Aware UI Summary
        console.log(`        • Console Trace   : ${traceGutter}`);
        if (config.spillDir && resolvedSpillFile) {
          console.log(`        • Human Spill     : ${path.basename(resolvedSpillFile)}`);
        }
        if (config.logDir && resolvedLogFile) {
          console.log(`        • APM Log         : ${path.basename(resolvedLogFile)}`);
        }
        console.log(`        • Telemetry Query : "${err.timestamp}"`);
        
        let hint;
        if (isEngineFault(err.stack)) {
          hint = `This is a tracing limitation within Kepoin. Your application code did NOT crash here. You can safely ignore this or avoid tracing strict Class definitions.`;
        } else {
          hint = generateHint(err.error || err.message);
        }
        
        if (hint) {
          const wrappedHint = wrapText(hint, 80, '            ');
          console.log(`        \x1b[35m💡 Diagnostic Hint:\x1b[0m \x1b[3m${wrappedHint}\x1b[0m`);
        }
        console.log(); // Blank line for breathing room
      });
    };

    if (appExceptions.length > 0) {
      console.log(' \x1b[33m⚠️  Exceptions Caught (Top 50):\x1b[0m');
      printExceptionList(appExceptions);
    }

    console.log('\n    \x1b[33m💡 [TIP]\x1b[0m The terminal summary is capped at 50 exceptions to protect memory.');
    if (totalAppExceptions > 50) {
      console.log(`    ${totalAppExceptions - 50} additional exceptions were not saved.`);
    }
    
    if (!config.logDir && !config.spillDir) {
      console.log('    Use --log-dir and --spill-dir to persistently stream traces to disk.');
    }
  }
  console.log('\n------------------------------------------------\n');
});

/**
 * Determines if an error was caused by Kepoin itself by inspecting the stack trace.
 */
function isEngineFault(errStack) {
  if (!errStack) return false;
  const lines = errStack.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('at ')) {
      // Ignore native frames like `at Reflect.get (<anonymous>)`
      if (line.includes('(<anonymous>)') || line.includes('(native)')) continue;
      
      // If the very first real code frame is Kepoin, it's our fault!
      if (line.includes('kepoin/src/') || line.includes('kepoin/bin/')) {
        return true;
      }
      return false; // It's user code
    }
  }
  return false;
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
 * Extracts a 5-line source code snippet around a specific line number.
 */
export function extractSourceSnippet(filePath, lineNumber) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const start = Math.max(0, lineNumber - 3);
    const end = Math.min(lines.length, lineNumber + 2);
    
    let snippet = '';
    for (let i = start; i < end; i++) {
      const isCrashLine = (i + 1) === lineNumber;
      const lineNumStr = String(i + 1).padStart(4, ' ');
      if (isCrashLine) {
        snippet += `\x1b[31m> ${lineNumStr} | ${lines[i]}\x1b[0m\n`;
      } else {
        snippet += `\x1b[90m  ${lineNumStr} | ${lines[i]}\x1b[0m\n`;
      }
    }
    return snippet.trimEnd();
  } catch (err) {
    return null;
  }
}

/**
 * Parses common JavaScript runtime errors and generates a human-readable diagnostic hint.
 * @param {string} errorStr The raw error message string.
 * @returns {string|null} The diagnostic hint or null if no heuristic matches.
 */
function generateHint(errorStr) {
  if (!errorStr) return null;
  
  let match;
  // TypeError: X is not a function
  match = errorStr.match(/(?:TypeError: )?(.+?) is not a function/);
  if (match) {
    return `You tried to call '${match[1].trim()}()', but it doesn't exist on this data type. Check if the variable is an Object instead of an Array.`;
  }
  
  // TypeError: Cannot read properties of null (reading 'X')
  match = errorStr.match(/Cannot read properties of (null|undefined) \(reading '(.+?)'\)/);
  if (match) {
    return `You tried to access '.${match[2]}', but the parent object is ${match[1]}. Check if your database or API query returned empty results.`;
  }
  
  // Cannot destructure property
  match = errorStr.match(/Cannot destructure property '(.+?)' of '(.+?)' as it is (null|undefined)/);
  if (match) {
    return `You tried to destructure '{ ${match[1]} }', but the parent object is ${match[3]}.`;
  }
  
  // ReferenceError: X is not defined
  match = errorStr.match(/(?:ReferenceError: )?(.+?) is not defined/);
  if (match && errorStr.includes('ReferenceError')) {
    return `The variable '${match[1]}' doesn't exist. Did you forget to import it, or misspell the name?`;
  }
  
  // SyntaxError: JSON
  if (errorStr.includes('Unexpected token') && errorStr.includes('JSON')) {
    return `You tried to parse invalid JSON. The server likely returned HTML (like an error page) instead of a JSON string.`;
  }
  
  // Network Errors
  if (errorStr.includes('ECONNREFUSED')) {
    return `The app could not connect to the database or external API. Make sure the service is running.`;
  }
  
  // Port in use
  if (errorStr.includes('EADDRINUSE')) {
    return `The port is already being used by another program. Try killing the hanging process or changing the port.`;
  }
  
  // Stack overflow
  if (errorStr.includes('Maximum call stack size exceeded')) {
    return `Infinite loop detected! A function is calling itself endlessly without a base case.`;
  }
  
  // Custom Errors
  if (errorStr.startsWith('Error: ') || errorStr === 'Error') {
    return `This appears to be a custom application exception intentionally thrown by the code.`;
  }
  
  // Proxy invariant error on Strict Classes
  if (errorStr.includes('property \'prototype\' is a read-only and non-configurable data property')) {
    return `This is a native V8 engine error caused by tracing a strict JS Class definition. Kepoin currently struggles with deep proxying of class constructors. Consider tracing the class instances instead.`;
  }
  
  return `We haven't mapped this anomaly yet! Help us improve the Local Diagnostics Engine by reporting this trace: https://github.com/adriantoirawan/kepoin/issues`;
}

/**
 * Wraps text to a specific length, prefixing subsequent lines with indentation.
 */
function wrapText(text, maxLineLength = 80, indentStr = '') {
  if (!text) return '';
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxLineLength) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.map((line, index) => {
    if (index === 0) return line;
    return `\n${indentStr}${line}`;
  }).join('');
}

/**
 * Formats a payload for ANSI terminal output using the injected Gutter.
 */
function formatAnsi(payload) {
  const config = getConfig();
  const { callId, location, status, message, duration, target, error, consoleTrace, caller, argsDump, sourceSnippet } = payload;
  const timeStr = duration ? ` (+${duration.toFixed(2)}ms)` : '';
  
  const idStr = callId ? `[#${callId}]`.padEnd(5, ' ') : '';
  const idPrefix = callId ? `\x1b[36m${idStr}\x1b[0m ` : '';
  const gutterStr = `\x1b[90m${consoleTrace}\x1b[0m `;

  let relativeLocation = location;
  if (location && path.isAbsolute(location)) {
    const rel = path.relative(process.cwd(), location);
    if (!rel.startsWith('..')) {
      relativeLocation = './' + rel;
    }
  }
  const locationStr = `[${relativeLocation || 'unknown'}]`;
  // Fixed indentation padding of 4 spaces after gutter
  const fixedPadding = '    ';

  let prefix = '';
  if (!hasPrintedLegend && status === 'Executing') {
    hasPrintedLegend = true;
    const cleanGutter = stripAnsi(gutterStr);
    const headerTitle = cleanGutter.length <= 6 ? 'Seq │' : 'Time & Seq │';
    const legendGutter = headerTitle.padEnd(cleanGutter.length, ' ');
    const legendId = '[#ID]'.padEnd(stripAnsi(idPrefix).length, ' ');
    const legendLoc = '[Location]'.padEnd(locationStr.length, ' ');
    prefix += `\x1b[90m${legendGutter}\x1b[0m\x1b[36m${legendId}\x1b[0m ${legendLoc} \x1b[36m▶ Status:   \x1b[0m targetFunction \x1b[90m(called by Caller)\x1b[0m\n`;
  }
  
  prefix += `${gutterStr}${idPrefix}${locationStr} `;
  
  if (status === 'Executing') {
    prefix += `\x1b[36m▶ Executing:\x1b[0m ${target}${caller ? ` \x1b[90m(called by ${caller})\x1b[0m` : ''}`;
  } else if (status === 'Resolved') {
    prefix += `\x1b[32m✔ Resolved:\x1b[0m ${target}${timeStr}`;
  } else if (status === 'Failed') {
    if (isEngineFault(payload.stack)) {
      if (!config.showTracingFaults) return '';
      prefix += `\x1b[35m⚠ Tracing Fault:\x1b[0m ${target}${timeStr}`;
    } else {
      prefix += `\x1b[31m✖ Failed:\x1b[0m ${target}${timeStr}`;
    }
    
    if (error || message) {
      const wrappedError = wrapText(error || message, 80, `${gutterStr}${fixedPadding}   ➔ `);
      prefix += `\n${gutterStr}${fixedPadding} ➔ \x1b[31m${wrappedError}\x1b[0m`;
    }
    
    if (argsDump) {
      prefix += `\n${gutterStr}${fixedPadding}\x1b[33mValues passed to function:\x1b[0m\n`;
      const argLines = argsDump.split('\n');
      prefix += argLines.map(line => `${gutterStr}${fixedPadding}  ${line}`).join('\n');
    }
    if (sourceSnippet) {
      prefix += `\n${gutterStr}${fixedPadding}\x1b[33mCode Context:\x1b[0m\n`;
      const lines = sourceSnippet.split('\n');
      prefix += lines.map(line => `${gutterStr}${fixedPadding}  ${line}`).join('\n');
    }
    
    let hint;
    if (isEngineFault(payload.stack)) {
      hint = `This is a tracing limitation within Kepoin. Your application code did NOT crash here. You can safely ignore this or avoid tracing strict Class definitions.`;
    } else {
      hint = generateHint(error || message);
    }
    
    if (hint) {
      const wrappedHint = wrapText(hint, 80, `${gutterStr}${fixedPadding}  `);
      prefix += `\n${gutterStr}\n${gutterStr}${fixedPadding}\x1b[35m💡 Diagnostic Hint:\x1b[0m \x1b[3m${wrappedHint}\x1b[0m`;
    }
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
    if (isEngineFault(payload.stack)) {
      totalEngineFaults++;
    } else {
      totalAppExceptions++;
      if (errorSummary.length < 50) {
        errorSummary.push(payload);
      }
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
