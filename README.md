# 🕵️ kepoin

> **Nosy by nature. Forensic by design.**

![npm](https://img.shields.io/npm/v/kepoin?color=cyan&label=npm%20install%20kepoin)
![node-current](https://img.shields.io/node/v/kepoin?color=green)
![license](https://img.shields.io/npm/l/kepoin)

**kepoin** is a zero-configuration, universal telemetry and forensic diagnostics library for Node.js. 

It acts as a passive observability layer, utilizing advanced ES6 Proxies and engine-level module interception to trace execution flow, benchmark asynchronous operations, and perform real-time memory autopsies when your application crashes. 

**No messy `console.log` statements. No complex APM agent setup. Zero mutations to your business logic.**

---

## 🛡️ Security First: The Enterprise Promise

Because `kepoin` recursively proxies and records function calls, arguments, and memory states, it requires the highest level of data security. **By default, `kepoin` is engineered to protect your sensitive data.**

* **Dynamic Data Redaction:** `kepoin` utilizes an $O(1)$ key-based sanitization engine. It automatically detects and redacts sensitive keys (e.g., `password`, `token`, `authorization`, `stripe_key`) from your payloads *before* they are serialized to disk.
* **Denial of Service (DoS) Protection:** To prevent massive objects (like raw HTTP requests) from hanging the V8 event loop, the sanitizer enforces a strict **Maximum Depth Limiter** and uses a `WeakSet` registry to safely bypass circular references.
* **The Production Kill Switch (`KEPOIN_ENABLED`):** `kepoin` is strictly designed for local development, debugging, and secure staging environments. If deployed to production, setting `KEPOIN_ENABLED=false` acts as a zero-overhead hardware bypass. It aborts all proxy generation and hook registration, acting as a pure passthrough with **0% performance penalty**.

---

## 🌟 Key Features

* **Universal Injection:** Flawlessly intercepts both legacy CommonJS (`require`) and modern ECMAScript Modules (`import`) at the engine level.
* **Recursive Proxy Cascading:** Automatically tracks deep method calls (`Service.SubService.execute()`) and newly instantiated objects (`new Class()`) without losing context.
* **The Forensic Autopsy:** Automatically catches unhandled errors and prints a map of the crashed module's live memory state—showing exact types, static properties, and instance methods.
* **Crash-Safe NDJSON Streaming:** Pipes execution traces to files asynchronously. If a fatal crash occurs, `kepoin` triggers an **Emergency Synchronous Flush** to guarantee your logs hit the disk before the process dies.
* **Native-Safe Execution:** Safely unwraps internal V8 slots to prevent `Incompatible receiver` engine crashes when tracking native Promises, HTTP Parsers, and Streams.

---

## 🛠️ When to use `kepoin`

1. **The Undocumented Legacy Codebase:** Map out deeply nested classes and "spooky action at a distance" simply by running the app and reading the sequential execution waterfall.
2. **Circular Dependencies & Silent Crashes:** Stop guessing why `Service.init is not a function`. The Forensic Autopsy dumps the module cache at the exact millisecond of the crash, revealing exactly what was (or wasn't) exported.
3. **Local Performance Benchmarking:** Instantly identify slow database queries or blocking loops. `kepoin` times every synchronous return and asynchronous Promise resolution automatically.
4. **CJS to ESM Migrations:** Gain a unified tracing layer to see exactly how the V8 engine is resolving your new `import` statements versus your old `require` paths.

---

## 📦 Installation

For the best Developer Experience, install `kepoin` globally to use the CLI, or add it to your project's dev dependencies.

```bash
# Install globally (Recommended for CLI usage)
npm install -g kepoin

# OR install locally as a dev dependency
npm install kepoin --save-dev
```

## 🚀 Usage Guide
`kepoin` treats code cleanliness as a first-class feature. **You do not need to change your application code to use kepoin.**

### Option A: The CLI (Zero-Config)
If installed globally, simply replace the word `node` with `kepoin`.

```bash
# Trace output to the terminal with ANSI colors
kepoin src/server.js

# Stream structured NDJSON for Datadog, Kibana, or CloudWatch
kepoin --out=trace.jsonl --format=json src/server.js
```

### Option B: Environment Injection
To inject kepoin into an existing `package.json` script (like `nest start`, `nodemon`, or `jest`) without altering the script itself, use the `NODE_OPTIONS` environment variable.

```bash
# Mac/Linux
KEPOIN_OUT_FILE="trace.jsonl" NODE_OPTIONS="--import kepoin" npm run dev

# Windows (PowerShell)
$env:KEPOIN_OUT_FILE="trace.jsonl"; $env:NODE_OPTIONS="--import kepoin"; npm run dev
```
*(Note: `kepoin` automatically appends the Process ID to file outputs in clustered environments or parallel test runners to prevent file-locking collisions).*

### Option C: Configuration File (`kepoin.json`)
For teams that want persistent settings and custom security dictionaries committed to source control, create a `kepoin.json` file in your project root.

```json
{
  "enabled": true,
  "outFile": "./logs/kepoin-trace.jsonl",
  "format": "json",
  "redactKeys": ["my_custom_internal_token", "aws_access_key"],
  "maxDepth": 5
}
```

### Option D: Surgical Manual Tracing
If global injection is too noisy, you can surgically wrap specific classes or instances inside your code.

```javascript
import { kepoin } from 'kepoin';
import DatabaseService from './services/db.js';

// Wrap an instance manually
const db = kepoin(new DatabaseService(), 'DatabaseService');

// Every call to this specific instance will now be tracked, timed, and sanitized!
await db.query('SELECT * FROM users'); 
```

### 🔍 Understanding the Autopsy
When an unhandled exception occurs, `kepoin` generates an autopsy report showing the live state of your modules.

```plaintext
[controller.js:15] ▶ Executing: model.dbReadAllAuthors
[model.js:12] ▶ Executing: config.query
[model.js:12] ✔ Resolved:  config.query (+46.76ms)
[controller.js:15] ✖ Failed:    model.dbReadAllAuthors (+47.37ms) - Authors.createBulkAuthors is not a function

 🔍 TELEMETRY FORENSIC AUTOPSY REPORT 
💥 Incident Location: model.dbReadAllAuthors
💥 Error Message:     Authors.createBulkAuthors is not a function

--- Active Local Module Cache State ---
controller.js        ➔ [Class/Function] Static properties: ["getIndex","getAuthors"], Instance methods: []
model.js             ➔ [Class/Function] Static properties: ["dbReadAllAuthors","dbInsPost"], Instance methods: []
class.js             ➔ [Object Object] Keys: ["Authors","Post"]
------------------------------------------------
```
*In the example above, the Autopsy instantly reveals that `class.js` is exporting an Object containing classes, not the Class itself—pinpointing a missing destructuring assignment without you having to open a debugger.*

📄 License
MIT © Adrianto Puji Irawan