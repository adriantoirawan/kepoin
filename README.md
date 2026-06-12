# 🕵️ kepo

> **Nosy by nature. Forensic by design.**

![npm](https://img.shields.io/npm/v/kepoin?color=cyan&label=npm%20install%20kepoin)
![node-current](https://img.shields.io/node/v/kepoin?color=green)
![license](https://img.shields.io/npm/l/kepoin)

**kepo** is a zero-configuration, universal telemetry and forensic diagnostics library for Node.js. 

It acts as a passive observability layer, utilizing advanced ES6 Proxies and engine-level module interception to trace execution flow, benchmark asynchronous operations, and perform real-time memory autopsies when your application crashes. 

**No messy `console.log` statements. No complex APM agent setup. Zero mutations to your business logic.**

---

## 🧠 What is kepo?

Traditional debugging relies on developers guessing where a bug might be and manually inserting `console.log()` statements. Enterprise Application Performance Monitoring (APM) tools (like Datadog or New Relic) are fantastic for production, but they are often too heavy, noisy, or complex to run locally or in CI pipelines.

`kepo` bridges this gap. By hooking directly into Node.js module resolution (via `require` overrides for CommonJS and `module.register` hooks for ESM), `kepo` watches everything your code does. It recursively wraps your classes, static methods, and instances in lightweight Proxies. 

When your app runs, it prints a beautiful, contextual execution tree. **When your app crashes, it intercepts the V8 engine's death sequence to dump a structural map of your memory directly to your terminal or log file.**

---

## 🌟 Key Features

* **Universal Injection:** Flawlessly intercepts both legacy CommonJS and modern ECMAScript Modules (ESM) at the engine level.
* **Recursive Proxy Cascading:** Automatically tracks deep method calls (`Service.SubService.execute()`) and newly instantiated objects (`new Class()`) without losing context.
* **The Forensic Autopsy:** Automatically catches unhandled errors and prints a map of the crashed module's live memory state—showing exact types, static properties, and instance methods.
* **Crash-Safe NDJSON Streaming:** Pipes execution traces to files asynchronously. If a fatal crash occurs, `kepo` triggers an **Emergency Synchronous Flush** to guarantee your logs hit the disk before the process dies.
* **Native-Safe Execution:** Safely unwraps internal V8 slots to prevent `Incompatible receiver` engine crashes when tracking native Promises, HTTP Parsers, and Streams.
* **Production Sleep Mode:** A zero-overhead kill switch (`KEPO_ENABLED=false`) allows the package to sit safely dormant in production environments without altering startup scripts.

---

## 🛠️ Deep Dive: Use Cases

`kepo` is designed for the hardest debugging scenarios Node.js developers face.

### 1. The Undocumented Legacy Codebase (Execution Tracing)
You just inherited a 5-year-old Node.js monolith. The documentation is missing, and everything relies on deeply nested classes and "spooky action at a distance." 
* **The kepo solution:** Run the app with `kepo`. As you click around the UI or fire API requests, `kepo` prints a sequential, time-stamped waterfall of exactly which files, classes, and methods are executing, allowing you to map the architecture in minutes.

### 2. Circular Dependencies & Silent Crashes (The Autopsy)
Your app crashes on startup with `TypeError: Service.initialize is not a function`. You check `Service.js` and the function is clearly written right there. You suspect a CommonJS circular dependency is causing an empty object `{}` export, but standard stack traces won't tell you.
* **The kepo solution:** `kepo` intercepts the crash and runs a **Forensic Autopsy**. It scans Node's internal cache and prints out exactly what `Service.js` was exporting at that exact millisecond. You instantly see that it exported a raw object instead of the Class, pinpointing the import flaw.

### 3. Performance Bottlenecking (Local Benchmarking)
An API endpoint is taking 2.5 seconds to resolve, but you don't know if the bottleneck is the database query, the file system read, or a synchronous data-parsing loop.
* **The kepo solution:** Because `kepo` automatically measures the duration of synchronous returns and asynchronous Promise resolutions, you simply look at the trace output. `kepo` highlights execution times (`+450ms`) directly in the terminal, pointing you straight to the slow function.

### 4. CJS to ESM Migrations
You are migrating a massive project to `"type": "module"`. Imports that used to work are suddenly failing, and module resolution is acting unpredictably.
* **The kepo solution:** Because `kepo` supports both module systems simultaneously, it provides a unified tracing layer. You can see exactly how the engine is resolving your new `import` statements versus the old `require` statements in real-time.

---

## 📦 Installation

For the best Developer Experience, install `kepo` globally to use the CLI, or add it to your project's dev dependencies.

```bash
# Install globally (Recommended for CLI usage)
npm install -g kepo

# OR install locally as a dev dependency
npm install kepo --save-dev
```

## 🚀 Usage Guide
`kepo` treats code cleanliness as a first-class feature. You do not need to change your application code to use kepo.

### Option A: The CLI (Zero-Config)
If installed globally, simply replace the word `node` with `kepo`. This is the fastest way to debug a local file.

```bash
# Trace output to the terminal with ANSI colors
kepo src/server.js

# Trace output to a clean text file (ANSI stripped automatically)
kepo --out=trace.log src/server.js

# Stream structured NDJSON for Datadog, Kibana, or CloudWatch
kepo --out=trace.jsonl --format=json src/server.js
```

### Option B: Environment Injection
To inject `kepo` into an existing, complex `package.json` script (like `nest start`, `nodemon`, or a test runner like `jest`) without altering the script itself, use the `NODE_OPTIONS` environment variable.

```bash
# Mac/Linux
KEPO_OUT_FILE="trace.jsonl" NODE_OPTIONS="--import kepo" npm run dev

# Windows (PowerShell)
$env:KEPO_OUT_FILE="trace.jsonl"; $env:NODE_OPTIONS="--import kepo"; npm run dev
(Note: kepo automatically appends the Process ID to file outputs in clustered environments or parallel test runners to prevent file-locking collisions).
```

### Option C: The Production Kill Switch
If you leave `--import kepo` in your CI/CD pipeline or Docker container, you can completely disable it by setting `KEPO_ENABLED=false`. The package will instantly short-circuit, bypass all proxy generation, and act as a pure passthrough with 0% performance overhead.

```bash
KEPO_ENABLED=false npm start
```

### Option D: Surgical Manual Tracing
If global injection is too noisy, you can surgically wrap specific classes or instances inside your code.

```javascript
import { kepo } from 'kepo';
import DatabaseService from './services/db.js';

// Wrap an instance manually
const db = kepo(new DatabaseService(), 'DatabaseService');

// Every call to this specific instance will now be tracked and timed
await db.query('SELECT * FROM users'); 
```

### 🔍 Understanding the Autopsy
When an unhandled exception occurs, `kepo` generates an autopsy report showing the live state of your modules.

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

In the example above, the Autopsy instantly reveals that `class.js` is exporting an Object containing classes, not the Class itself—pinpointing a missing destructuring assignment without you having to open a debugger.

📄 License
MIT © Adrianto Puji Irawan