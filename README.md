# 🕵️ kepoin

> **Nosy by nature. Forensic by design.**

![npm](https://img.shields.io/npm/v/kepoin?color=cyan&label=npm%20install%20kepoin)
![node-current](https://img.shields.io/node/v/kepoin?color=green)
![license](https://img.shields.io/npm/l/kepoin)

**kepoin** is a zero-configuration, universal telemetry and forensic diagnostics library for Node.js. 

It acts as a passive observability layer, utilizing advanced ES6 Proxies and engine-level module interception to trace execution flow, benchmark asynchronous operations, and perform real-time memory autopsies when your application crashes. 

**No messy `console.log` statements. No complex APM agent setup. Zero mutations to your business logic.**

---

## 🛡️ Security Measures

Because `kepoin` recursively proxies and records function calls, arguments, and memory states, it requires the highest level of data security. **By default, `kepoin` is engineered to protect your sensitive data.**

* **Dynamic Data Redaction:** `kepoin` utilizes an $O(1)$ key-based sanitization engine. It automatically detects and redacts sensitive keys (e.g., `password`, `token`, `authorization`, `stripe_key`) from your payloads *before* they are serialized to disk.
* **Denial of Service (DoS) Protection:** To prevent massive objects (like raw HTTP requests) from hanging the V8 event loop, the sanitizer enforces a strict **Maximum Depth Limiter** and uses a `WeakSet` registry to safely bypass circular references.
* **The Production Kill Switch (`KEPOIN_ENABLED`):** `kepoin` is strictly designed for local development, debugging, and secure staging environments. If deployed to production, setting `KEPOIN_ENABLED=false` acts as a zero-overhead Hard kill switch. It aborts all proxy generation and hook registration, acting as a pure passthrough with **0% performance penalty**.

---

## 🌟 Key Features

* **Universal Injection:** Flawlessly intercepts both legacy CommonJS (`require`) and modern ECMAScript Modules (`import`) at the engine level.
* **Recursive Proxy Cascading:** Automatically tracks deep method calls (`Service.SubService.execute()`) and newly instantiated objects (`new Class()`) without losing context.
* **The Forensic Autopsy:** Automatically catches unhandled errors and prints a map of the crashed module's live memory state—showing exact types, static properties, and instance methods.
* **Crash-Safe NDJSON Streaming:** Pipes execution traces to files asynchronously. If a fatal crash occurs, `kepoin` triggers an **Emergency Synchronous Flush** to guarantee your logs hit the disk before the process dies.
* **Native-Safe Execution:** Safely unwraps internal V8 slots to prevent `Incompatible receiver` engine crashes when tracking native Promises, HTTP Parsers, and Streams.
* **Universal CLI & Typo Safety:** The CLI dynamically extracts native Node.js flags, providing instantaneous passthrough support for 272+ flags (like `--inspect`). It intercepts typos with empathetic "Did you mean?" suggestions instead of crashing.
* **Zero-Overhead Update Checker:** A detached, non-blocking background check ensures you always know when a new version is available. It silently aborts if your script finishes too quickly, guaranteeing **0% performance penalty** and zero event loop blocking.

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

## 📚 Comprehensive Documentation

For a deep dive into `kepoin`'s architecture and capabilities, check out the official user guides:

* [CLI & Configuration Guide](./docs/cli-and-configuration.md): Master the CLI flags and `kepoin.json`.
* [The Forensic Autopsy](./docs/the-forensic-autopsy.md): Learn how to interpret the module cache dump during a crash.
* [Security & Redaction](./docs/security-and-redaction.md): Understand the $O(1)$ sanitizer, WeakSet protection, and the Hard Kill Switch.

---

## 🚩 CLI Flags Reference

| Flag | Description | Use Case |
|---|---|---|
| `--out=<file>` | Stream NDJSON logs to a file. | Ingesting traces into Datadog/Kibana. |
| `--format=<fmt>` | Override output format (`ansi` or `json`). | Forcing JSON output in the terminal. |
| `--slow=<ms>` | Threshold Tracing. | Isolating slow database queries. |
| `--max-depth=<N>` | Object serialization depth (default: 4). | Deeply inspecting nested payloads. |
| `--redact=<keys>` | Add custom keys to the scrub list. | Redacting proprietary API tokens. |
| `--verbose` | Diagnostic mode. | Debugging which files kepoin is intercepting. |
| `--disable` | The Hard Kill Switch. | Bypassing all tracing in production (0% overhead). |
| `--examples` | List interactive examples. | Learning how to use the library. |
| `--init-examples`| Extract examples to local project. | Bootstrapping the interactive sandbox. |

---

## 🎮 Interactive Tutorial Suite

Want to see exactly how `kepoin` catches crashes, protects circular references, and redacts PII?

Run the interactive examples wizard in your terminal:
```bash
# Safely copy the interactive examples into your current directory
kepoin --init-examples

# List the commands to run them!
kepoin --examples
```

---

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

> [!WARNING]
> **CommonJS Limitation:** Surgical manual tracing (`import { kepoin } from 'kepoin'`) currently requires Native ECMAScript Modules (ESM). In CommonJS (`require('kepoin')`), this API acts as a passive passthrough. CommonJS projects should rely on the zero-config CLI or `NODE_OPTIONS` injection instead.

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