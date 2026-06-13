#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const nodeArgs = [];
const scriptArgs = [];
const envVars = {};

const CJS_LOADER = path.join(__dirname, '../src/loaders/register.js');
const ESM_LOADER = path.join(__dirname, '../src/loaders/hooks.js');

function getPkgInfo() {
  try {
    const pkgPath = path.join(__dirname, '../package.json');
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (e) {
    return { version: 'unknown', homepage: 'https://github.com/adriantoirawan/kepoin' };
  }
}

function printUsage() {
  const pkg = getPkgInfo();
  console.log(`
\x1b[36m🕵️  \x1b[1mkepoin (v${pkg.version})\x1b[0m
\x1b[36m┌──────────────────────────────────────────┐
│  Nosy by nature. Forensic by design.     │
└──────────────────────────────────────────┘\x1b[0m

\x1b[1mUSAGE\x1b[0m
  $ kepoin [options] <script.js>
  $ kepoin replay <file.spil>   # Launch the Interactive Cinematic Replay Engine
  $ kepoin listen               # Start the Centralized Telemetry Hub for Mobile (Experimental)\x1b[0m

\x1b[1mEXAMPLE COMMANDS\x1b[0m
  \x1b[90m# Trace local development in the terminal\x1b[0m
  $ kepoin server.js

  \x1b[90m# Hunt for bottlenecks and stream human-readable traces to a directory\x1b[0m
  $ kepoin --spill-dir=./logs --slow=50 server.js

  \x1b[90m# Later, replay the massive .spil file dynamically with Matrix Auto-Play\x1b[0m
  $ kepoin replay ./logs/execution-2026-10-14.spil

  \x1b[90m# Protect custom sensitive tokens from being logged\x1b[0m
  $ kepoin --redact="stripe_key,db_pass" script.js

\x1b[1mMORE INFO\x1b[0m
  * Run \x1b[33mkepoin --help\x1b[0m for the full list of options and environment variables.
  * Deep documentation is available in \x1b[34m/docs/architecture\x1b[0m, \x1b[34m/docs/babysteps\x1b[0m, and \x1b[34m/docs/reference\x1b[0m.
  * Online: \x1b[34m${pkg.homepage.replace('#readme', '')}\x1b[0m
  * Bugs:   \x1b[34mhttps://github.com/adriantoirawan/kepoin/issues\x1b[0m

\x1b[33m[kepoin:tip]\x1b[0m \x1b[35mkepoin is deeply forensic. Active tracing in production involves performance & security tradeoffs.\x1b[0m
\x1b[33m[kepoin:tip]\x1b[0m Read the analysis: \x1b[34mhttps://github.com/adriantoirawan/kepoin/blob/main/docs/reference/production-tradeoffs.md\x1b[0m
`);
}

function printHelp() {
  const pkg = getPkgInfo();
  console.log(`
\x1b[36m🕵️  \x1b[1mkepoin (v${pkg.version})\x1b[0m
\x1b[36m┌──────────────────────────────────────────┐
│  Nosy by nature. Forensic by design.     │
└──────────────────────────────────────────┘\x1b[0m

\x1b[1mUSAGE\x1b[0m
  $ kepoin [options] <script.js>
  $ kepoin replay <file.spil>   # Launch the Interactive Cinematic Replay Engine (Nano-style UI)
  $ kepoin listen               # Start the Centralized Telemetry Hub for Mobile (Experimental)\x1b[0m

\x1b[1mOPTIONS\x1b[0m
  --log-dir=<path>, -ld     Stream machine-readable JSON logs to <path>/telemetry-YYYY-MM-DD.jsonl
  --spill-dir=<path>, -sd   Stream human-readable execution traces to <path>/execution-YYYY-MM-DD.spil
  --format=<fmt>    Force terminal log format ('ansi' or 'json'). Defaults to ansi.
  --slow=<ms>       Threshold Tracing: Only log functions that take longer than <ms> milliseconds.
  --max-depth=<N>   Override the maximum object serialization depth (default: 4).
  --redact=<keys>   Comma-separated list of extra keys to redact (e.g., "ssn,api_key").
  --verbose         Print diagnostic internal kepoin logs.
  --disable         Hard kill switch. Bypasses all tracing with 0% performance penalty.
  --ws-port=<port>  (Hub Mode) Port for the WebSocket server (default: 54321).
  --examples        List interactive examples bundled with kepoin.
  --init-examples   Copy interactive examples to ./kepoin-examples/ in your current directory.
  -h, --help        Show this help message.
  -v, --version     Show the current version.

\x1b[1mENVIRONMENT VARIABLES MAPPING\x1b[0m
  You can configure kepoin via \x1b[33mkepoin.json\x1b[0m or by using these environment variables:
  \x1b[36mKEPOIN_LOG_DIR\x1b[0m        ➔ Maps to \x1b[33m--log-dir (-ld)\x1b[0m
  \x1b[36mKEPOIN_SPILL_DIR\x1b[0m      ➔ Maps to \x1b[33m--spill-dir (-sd)\x1b[0m
  \x1b[36mKEPOIN_FORMAT\x1b[0m         ➔ Maps to \x1b[33m--format\x1b[0m
  \x1b[36mKEPOIN_SLOW_THRESHOLD\x1b[0m ➔ Maps to \x1b[33m--slow\x1b[0m
  \x1b[36mKEPOIN_MAX_DEPTH\x1b[0m      ➔ Maps to \x1b[33m--max-depth\x1b[0m
  \x1b[36mKEPOIN_REDACT_KEYS\x1b[0m    ➔ Maps to \x1b[33m--redact\x1b[0m
  \x1b[36mKEPOIN_VERBOSE\x1b[0m        ➔ Maps to \x1b[33m--verbose\x1b[0m
  \x1b[36mKEPOIN_ENABLED\x1b[0m        ➔ Maps to \x1b[33m--disable\x1b[0m (when set to 'false')

\x1b[1mEXAMPLE COMMANDS\x1b[0m
  \x1b[90m# Trace local development in the terminal\x1b[0m
  $ kepoin server.js

  \x1b[90m# Hunt for performance bottlenecks (only log methods taking > 50ms)\x1b[0m
  $ kepoin --out=trace.jsonl --slow=50 server.js

  \x1b[90m# Protect custom sensitive tokens from being logged\x1b[0m
  $ kepoin --redact="stripe_key,db_pass" script.js

\x1b[1mMORE INFO\x1b[0m
  * Run \x1b[33mkepoin --help\x1b[0m for the full list of options and environment variables.
  * Deep documentation is available in \x1b[34m/docs/architecture\x1b[0m, \x1b[34m/docs/babysteps\x1b[0m, and \x1b[34m/docs/reference\x1b[0m.
  * Online: \x1b[34m${pkg.homepage.replace('#readme', '')}\x1b[0m
  * Bugs:   \x1b[34mhttps://github.com/adriantoirawan/kepoin/issues\x1b[0m

\x1b[33m[kepoin:tip]\x1b[0m \x1b[35mkepoin is deeply forensic. Active tracing in production involves performance & security tradeoffs.\x1b[0m
\x1b[33m[kepoin:tip]\x1b[0m Read the analysis: \x1b[34mhttps://github.com/adriantoirawan/kepoin/blob/main/docs/reference/production-tradeoffs.md\x1b[0m
`);
}

function printExamples() {
  console.log(`
\x1b[36m\x1b[1m📚 kepoin Interactive Examples\x1b[0m

To play with these examples, first copy them to your project by running:
  \x1b[33m$ kepoin --init-examples\x1b[0m

Then you can open the files to review the code and run them:

\x1b[1m1. Crash Autopsy & Circular References\x1b[0m
   Demonstrates default tracking, circular reference protection, and the
   Forensic Autopsy engine by intentionally crashing a simulated database.
   \x1b[33mCommand:\x1b[0m npx kepoin ./kepoin-examples/01-crash-autopsy/demo.cjs

\x1b[1m2. Surgical Tracing & Automatic Redaction\x1b[0m
   Shows how to bypass the CLI entirely. You can use \`import { kepoin }\` to 
   wrap a specific class. It also passes a \`stripe_key\` to demonstrate redaction.
   \x1b[33mCommand:\x1b[0m node ./kepoin-examples/02-surgical-tracing/demo.mjs

\x1b[1m3. Performance Auditing (Threshold Tracing)\x1b[0m
   A script containing two functions (one fast, one slow). By passing \`--slow=100\`,
   the fast function is ignored, helping you isolate bottlenecks instantly.
   \x1b[33mCommand:\x1b[0m npx kepoin --slow=100 ./kepoin-examples/03-performance-audit/demo.cjs

\x1b[1m4. The Cinematic Replay Engine\x1b[0m
   Generates a massive 1000-line \`.spil\` trace file that you can replay
   interactively like a movie. Features a Nano-style persistent control bar,
   a Pokemon-style encounter boot animation, and dramatic slow-mo anomalies.
   \x1b[33mStep 1:\x1b[0m npx kepoin --spill-dir=./logs ./kepoin-examples/06-cinematic-replay/demo.cjs
   \x1b[33mStep 2:\x1b[0m npx kepoin replay ./logs/execution-<date>.spil
   (Hint: Press \`[ENTER]\` to skip the boot animation!)

\x1b[1m5. Corrupted Configuration Guardrails\x1b[0m
   Demonstrates kepoin's graceful fallback when encountering a malformed \`kepoin.json\`
   file, issuing a gentle warning instead of crashing the process.
   \x1b[33mCommand:\x1b[0m cd kepoin-examples/04-corrupted-config && npx kepoin demo.js
`);
}

function printVersion() {
  const pkg = getPkgInfo();
  console.log(`v${pkg.version}`);
}

if (args.length === 0) {
  printUsage();
  process.exit(0);
}

if (args.includes('-h') || args.includes('--help')) {
  printHelp();
  process.exit(0);
}

if (args.includes('--examples')) {
  printExamples();
  process.exit(0);
}

if (args.includes('--init-examples')) {
  const sourceDir = path.join(__dirname, '../examples');
  const destDir = path.join(process.cwd(), 'kepoin-examples');
  if (fs.existsSync(destDir)) {
    console.error(`\x1b[31m[kepoin:error]\x1b[0m Directory './kepoin-examples' already exists.`);
    process.exit(1);
  }
  fs.cpSync(sourceDir, destDir, { recursive: true });
  console.log(`\x1b[32m[kepoin:success]\x1b[0m Examples successfully copied to \x1b[1m./kepoin-examples/\x1b[0m`);
  console.log(`Run \x1b[36mkepoin --examples\x1b[0m to see the commands to run them!`);
  process.exit(0);
}

if (args.includes('-v') || args.includes('--version')) {
  printVersion();
  process.exit(0);
}

const KEPOIN_FLAGS = ['--log-dir', '-ld', '--spill-dir', '-sd', '--format', '--slow', '--max-depth', '--redact', '--verbose', '--disable', '--ws-port', '--examples', '--init-examples', '--help', '--version', '-h', '-v'];

function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

const nodeEnvFlags = new Set(process.allowedNodeEnvironmentFlags);
// Add common CLI-only flags that aren't in environment flags
const extraNodeFlags = ['test', 'watch', 'eval', 'print', 'require', 'import', 'experimental-loader', 'no-warnings', 'preserve-symlinks'];
extraNodeFlags.forEach(f => nodeEnvFlags.add(f));

let isParsingKepoinArgs = true;
let providedKepoinFlags = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (isParsingKepoinArgs) {
    if (arg.startsWith('--log-dir=')) {
      envVars.KEPOIN_LOG_DIR = arg.split('=')[1];
      providedKepoinFlags.push(arg);
      continue;
    }
    if (arg.startsWith('-ld=')) {
      envVars.KEPOIN_LOG_DIR = arg.split('=')[1];
      providedKepoinFlags.push(arg);
      continue;
    }
    if (arg.startsWith('--spill-dir=')) {
      envVars.KEPOIN_SPILL_DIR = arg.split('=')[1];
      providedKepoinFlags.push(arg);
      continue;
    }
    if (arg.startsWith('-sd=')) {
      envVars.KEPOIN_SPILL_DIR = arg.split('=')[1];
      providedKepoinFlags.push(arg);
      continue;
    }
    if (arg.startsWith('--format=')) {
      envVars.KEPOIN_FORMAT = arg.split('=')[1];
      providedKepoinFlags.push(arg);
      continue;
    }
    if (arg.startsWith('--slow=')) {
      envVars.KEPOIN_SLOW_THRESHOLD = arg.split('=')[1];
      providedKepoinFlags.push(arg);
      continue;
    }
    if (arg.startsWith('--max-depth=')) {
      envVars.KEPOIN_MAX_DEPTH = arg.split('=')[1];
      providedKepoinFlags.push(arg);
      continue;
    }
    if (arg.startsWith('--redact=')) {
      envVars.KEPOIN_REDACT_KEYS = arg.split('=')[1];
      providedKepoinFlags.push(arg);
      continue;
    }
    if (arg === '--verbose') {
      envVars.KEPOIN_VERBOSE = 'true';
      providedKepoinFlags.push(arg);
      continue;
    }
    if (arg === '--disable') {
      envVars.KEPOIN_ENABLED = 'false';
      providedKepoinFlags.push(arg);
      continue;
    }
    if (arg.startsWith('--ws-port=')) {
      envVars.KEPOIN_WS_PORT = arg.split('=')[1];
      providedKepoinFlags.push(arg);
      continue;
    }
    
    if (arg === 'listen' && i === 0) {
      continue;
    }

    if (arg === 'replay' && i === 0) {
      continue;
    }
    
    // Strict Flag Parsing: check if it's an unrecognized flag
    if (arg.startsWith('-')) {
      const baseFlag = arg.split('=')[0];
      const strippedFlag = baseFlag.replace(/^-+/, '');
      
      // Is it a universally supported node flag?
      if (nodeEnvFlags.has(strippedFlag)) {
        nodeArgs.push(arg);
        continue;
      }

      // It's unknown. Check if it's a typo of a kepoin flag.
      let closestMatch = null;
      let minDistance = Infinity;
      for (const known of KEPOIN_FLAGS) {
        const dist = levenshtein(baseFlag, known);
        if (dist < minDistance) {
          minDistance = dist;
          closestMatch = known;
        }
      }

      if (minDistance <= 3) {
        console.error(`\x1b[31m[kepoin:error]\x1b[0m Unknown flag '${arg}'. Did you mean '${closestMatch}'?`);
      } else {
        console.error(`\x1b[31m[kepoin:error]\x1b[0m Unknown flag '${arg}'.`);
        console.error(`\x1b[33m[kepoin:hint]\x1b[0m If you are trying to pass a niche Node.js flag, please set it via the environment instead: \x1b[1mNODE_OPTIONS='${arg}' kepoin <script.js>\x1b[0m`);
      }
      process.exit(1);
    }
    
    isParsingKepoinArgs = false;
  }

  scriptArgs.push(arg);
}

if (scriptArgs.length === 0 && args[0] !== 'listen' && args[0] !== 'replay') {
  // Empathic "Missing Script" Error Flow
  if (providedKepoinFlags.length > 0) {
    console.log(`\x1b[33m[kepoin:info]\x1b[0m Received flags: ${providedKepoinFlags.join(' ')}`);
  }
  console.log(`\x1b[36m[kepoin:info]\x1b[0m You provided configuration flags, but kepoin needs a target script to run against.\n`);
  
  printUsage();
  
  console.error(`\n\x1b[31m[kepoin:error]\x1b[0m Missing target script. Usage: \x1b[1mkepoin [options] <script.js>\x1b[0m`);
  process.exit(1);
}

// Silence annoying Node Experimental Warnings
nodeArgs.push('--no-warnings');

// Only inject loaders if we aren't disabled
if (envVars.KEPOIN_ENABLED !== 'false') {
  nodeArgs.push('--require', CJS_LOADER);
  nodeArgs.push('--experimental-loader', `file://${ESM_LOADER}`);
}

const finalEnv = { ...process.env, ...envVars };

function isNewerVersion(latest, current) {
  const lParts = latest.split('.').map(Number);
  const cParts = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (lParts[i] > cParts[i]) return true;
    if (lParts[i] < cParts[i]) return false;
  }
  return false;
}

async function fetchLatestVersion() {
  if (!process.stdout.isTTY || envVars.KEPOIN_ENABLED === 'false' || process.env.CI) {
    return null;
  }
  
  return new Promise((resolve) => {
    const req = https.get('https://registry.npmjs.org/kepoin/latest', (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const latest = JSON.parse(data).version;
            const current = getPkgInfo().version;
            if (latest && current && isNewerVersion(latest, current)) {
               resolve(`\x1b[33m[kepoin:update]\x1b[0m A new version is available! \x1b[31m${current}\x1b[0m ➔ \x1b[32m${latest}\x1b[0m (Run \x1b[1mnpm i -g kepoin\x1b[0m)`);
            } else {
               resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        });
      } else {
        resolve(null);
      }
    }).on('error', () => resolve(null));
    
    // Strict 500ms timeout
    setTimeout(() => {
      req.destroy();
      resolve(null);
    }, 500);
  });
}

function printBanner(updateMessage) {
  
  const pkg = getPkgInfo();
  console.log(`\x1b[36m🕵️  \x1b[1mkepoin (v${pkg.version})\x1b[0m`);
  console.log(`\x1b[36m┌──────────────────────────────────────────┐`);
  console.log(`│  Nosy by nature. Forensic by design.     │`);
  console.log(`└──────────────────────────────────────────┘\x1b[0m`);
  
  if (updateMessage) {
    console.log(updateMessage);
  }

  if (args[0] === 'listen') {
    console.log(`\x1b[36m[kepoin:info]\x1b[0m Mode: Hub (Standalone)`);
    console.log(`\x1b[36m[kepoin:info]\x1b[0m WebSocket Port: ${envVars.KEPOIN_WS_PORT || 54321}`);
  } else {
    console.log(`\x1b[36m[kepoin:info]\x1b[0m Target: ${scriptArgs.join(' ')}`);
    if (envVars.KEPOIN_LOG_DIR) console.log(`[kepoin:info] APM Log Dir: ${envVars.KEPOIN_LOG_DIR}`);
    if (envVars.KEPOIN_SPILL_DIR) console.log(`[kepoin:info] Spill Dir: ${envVars.KEPOIN_SPILL_DIR}`);
    if (envVars.KEPOIN_REDACT_KEYS) console.log(`\x1b[36m[kepoin:info]\x1b[0m Redaction: ${envVars.KEPOIN_REDACT_KEYS}`);
    if (envVars.KEPOIN_SLOW_THRESHOLD) console.log(`\x1b[36m[kepoin:info]\x1b[0m Threshold: >${envVars.KEPOIN_SLOW_THRESHOLD}ms`);
  }
  console.log(`\x1b[36m[kepoin:info]\x1b[0m Bugs: https://github.com/adriantoirawan/kepoin/issues`);
  console.log(`\x1b[33m[kepoin:tip]\x1b[0m \x1b[35mkepoin is deeply forensic. Active tracing in production involves performance & security tradeoffs.\x1b[0m`);
  console.log(`\x1b[33m[kepoin:tip]\x1b[0m Read the analysis: \x1b[34mhttps://github.com/adriantoirawan/kepoin/blob/main/docs/reference/production-tradeoffs.md\x1b[0m`);
  console.log(); // Blank line for padding
}

async function bootKepoin() {
  const updateMessage = await fetchLatestVersion();
  
  if (args[0] !== 'replay') {
    printBanner(updateMessage);
  }

  if (args[0] === 'listen') {
    // Start the Centralized Telemetry Hub
    Object.assign(process.env, envVars);
    import('../src/server/hub.js').then(({ startHub }) => {
      startHub(finalEnv);
    });
  } else if (args[0] === 'replay') {
    const replayFile = scriptArgs[0];
    if (!replayFile || !replayFile.endsWith('.spil')) {
      console.error(`\x1b[31m[kepoin:error]\x1b[0m Missing or invalid trace file. Usage: \x1b[1mkepoin replay <file.spil>\x1b[0m`);
      process.exit(1);
    }
    import('../src/core/replay.js').then(({ startReplay }) => {
      startReplay(replayFile);
    });
  } else {
    // Spawn the child node process
    const child = spawn(process.execPath, [...nodeArgs, ...scriptArgs], {
      stdio: 'inherit',
      env: finalEnv,
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
      } else {
        process.exit(code || 0);
      }
    });
  }
}

bootKepoin();
