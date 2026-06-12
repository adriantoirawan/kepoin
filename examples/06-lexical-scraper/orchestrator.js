import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// We must dynamically resolve the Register path so this example runs anywhere
const REGISTER_PATH = join(__dirname, '../../src/loaders/register.js');
const CRASH_SCRIPT = join(__dirname, 'crash.js');

console.log('🚀 Orchestrator: Spawning target script with Stealth Injector (Headless Mode)...');

// 1. Spawn the Target Script with IPC enabled and KEPOIN_HEADLESS=true
// In a real SaaS like reskyu, this is how you seamlessly extract crash data from a user's Node script!
const target = spawn(process.execPath, ['--require', REGISTER_PATH, CRASH_SCRIPT], {
  stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  env: { ...process.env, KEPOIN_HEADLESS: 'true' }
});

// 2. Intercept the Payload
target.on('message', (msg) => {
  if (msg.type === 'kepoin:crash') {
    console.log('\\n💥 Orchestrator Intercepted Crash Payload via IPC!');
    console.log('   Error:', msg.payload.errorMessage);
    console.log('   Location:', msg.payload.incidentLocation);
    
    console.log('\\n🕵️‍♂️ V8 Lexical Scraper Dump (Notice the local variables!):');
    console.dir(msg.payload.localVariables, { depth: null, colors: true });
    
    target.kill();
  }
});

target.stderr.on('data', d => console.log(d.toString()));
