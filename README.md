# 🕵️ kepoin

> **Nosy by nature. Forensic by design.**

![npm](https://img.shields.io/npm/v/kepoin?color=cyan&label=npm%20install%20kepoin)
![node-current](https://img.shields.io/node/v/kepoin?color=green)
![license](https://img.shields.io/npm/l/kepoin)

**kepoin** is a zero-configuration, universal telemetry and forensic diagnostics hub for Node.js and Mobile Runtimes. 

**No messy `console.log` statements. No complex APM setup. Zero mutations to your business logic.**

> [!TIP]
> **Production Environments:** kepoin is deeply forensic. Active tracing in production involves performance & security tradeoffs. Read our [Production Tradeoffs Analysis](./docs/reference/production-tradeoffs.md) before deploying.

---

## 📦 Installation & Quick Start

```bash
# Install globally to trace any script instantly
npm install -g kepoin

# Install locally as a dev dependency for project setups
npm install kepoin --save-dev
```

### Try it out immediately:
Once installed globally, you can trace any Node.js script instantly by replacing `node` with `kepoin`:
```bash
kepoin my-script.js
```

### Interactive Examples Suite
`kepoin` ships with a suite of interactive, self-contained examples. You can extract and run them without touching your own code:
```bash
# Safely copy the interactive examples into your current directory
kepoin --init-examples

# List the commands to run them!
kepoin --examples
```

---

## 🌟 Key Features

### 1. The Replay Engine
When debugging distributed clusters or multi-day test runs, developers can dump human-readable execution streams using `--spill-dir`. Later, you can run `kepoin replay <file>.spil` to boot an **Interactive Matrix-Style Replay Engine**.

Features a full hardware-accelerated **`nano`-style terminal interface** where you can smoothly auto-play thousands of traces, interactively toggle speeds, and experience "Bullet Time" cinematic blasts when an anomaly crashes the trace!

### 2. V8 Lexical Scope Scraper (Backend)
By booting with `--require kepoin/register` (or using `kepoin [target]`), our engine programmatically hooks into `node:inspector` upon crashing, safely dumping the **local variables and lexical scope** mapped to the exact line of failure.

### 3. The Local Diagnostics Engine
Standard Node.js crash traces tell you *where* the app died. `kepoin` tells you *why*.
When an anomaly occurs, Kepoin parses the raw arguments natively (e.g. `Values passed to function: arg1 (string): "hello"`), extracts a 5-line source code snippet pointing directly to the failure, and runs a heuristic Regex engine to provide a **💡 Diagnostic Hint** translating `TypeError` and `ReferenceError` into plain English.

### 4. The Centralized Telemetry Hub
`kepoin listen` boots a blazing-fast local WebSocket server that aggregates crash reports and diagnostics from mobile applications into a single beautifully colored terminal stream, or NDJSON file output.

### 5. Mobile App Crash Bridges
> [!WARNING]
> **Experimental:** Mobile support is currently experimental and subject to change.

We provide import-safe, zero-config hooks that intercept unhandled exceptions before frameworks swallow them.
* **`import 'kepoin/mobile'`**: Natively binds to JavaScriptCore/Hermes `global.ErrorUtils` for React Native & Expo, streaming crash autopsies directly back to the Hub on your local machine.

---

## 🛡️ Security Measures & Zero-Gravity Mandates

Because `kepoin` recursively proxies and tracks the execution pipeline, it strictly enforces hardware constraints to maintain a 0% performance penalty.
* **Dynamic Data Redaction:** An $O(1)$ sanitization engine immediately redacts sensitive keys (`password`, `token`, etc.).
* **The Production Kill Switch:** Setting `KEPOIN_ENABLED=false` acts as a zero-overhead Hard Kill Switch.

---

## 👶 The Babystep Guides (Start Here)

To make integration absolutely frictionless, we have split our documentation into step-by-step guides. If you are new to `kepoin`, start with the guide that matches your stack:

* [01. React Native & Mobile Apps](./docs/babysteps/01-react-native-mobile.md)
* [02. Node.js Backends](./docs/babysteps/03-nodejs-backend.md)

---

## 🚀 Usage Quickstart

### 1. The Zero-Config CLI
If installed globally, you can execute and trace any script directly:
```bash
kepoin src/server.js
```

### 2. Injecting into Backend Node.js
If you are using existing script runners (like `nodemon`, `jest`, or `nest start`), do not mutate your source code. Inject `kepoin` via Node environment variables.
```bash
# Mac/Linux
NODE_OPTIONS="--require kepoin/register" npm run start
```
> [!NOTE]
> **The Module Boundary:** To maintain 0% performance overhead, `kepoin` operates by wrapping your `module.exports`. This means it only traces **exported functions** that are imported and called from **another file**. It does *not* trace local function calls executing internally within the same file.

### 3. Zero-Config Tracing with TypeScript
Kepoin fully supports TypeScript, out-of-the-box, without changing your compilation pipeline. If you use `tsx` (the modern standard for Node+TypeScript), simply inject both loaders simultaneously:
```bash
node --require kepoin/register --import tsx server.ts
```
Because `tsx` handles source-maps automatically, Kepoin's crash autopsies will seamlessly point to your original `.ts` files!
We also ship `src/index.d.ts` for developers who want to use **Surgical Tracing** (`import { kepoin } from 'kepoin'`) natively in their typed stack.

### 4. Booting the Hub
```bash
# Start the Standalone Telemetry Hub
kepoin listen
```

### 5. Injecting into Mobile (React Native/Expo)
> [!WARNING]
> **Experimental:** Mobile support is currently experimental and subject to change.

Import the mobile adapter in `App.js`:
```javascript
import { initKepoinMobile } from 'kepoin/mobile';

initKepoinMobile();
```

---

## 🚩 CLI Flags Reference

When running `kepoin <script.js>` or `kepoin listen`, you can pass the following flags to customize its behavior. You can read the full [CLI & Configuration Guide](./docs/reference/cli-and-configuration.md) for more details.

| Flag/Command | Expects | Description & Use Case |
|---|---|---|
| `listen` | Command | **Boot the Telemetry Hub.** Starts a local WebSocket server (port `54321`). |
| `replay <file>` | Command | **Boot the Replay Engine.** Playback `.spil` trace files dynamically. |
| `--log-dir=<path>` | Directory | **APM Integrations.** Stream machine-readable JSONL files for massive data crunching. |
| `--spill-dir=<path>` | Directory | **Human Readable Dumps.** Stream ANSI-stripped `.spil` logs for the Replay engine. |
| `--slow=<ms>` | Milliseconds | **Threshold Tracing.** Only log functions that take longer than this threshold. |
| `--max-depth=<N>` | Integer | **Override serialization depth.** Default is 4. |
| `--redact=<keys>` | Strings | **Custom Redaction Dictionary.** Add extra keys to scrub. |
| `--disable` | None | **The Hard Kill Switch.** Bypasses all tracing entirely. |
| `--show-tracing-faults` | None | **Debug Tracing Engine.** Includes internal Kepoin proxy faults in terminal trace output. |
| `--examples` | None | Lists interactive examples bundled with the package. |
| `--init-examples`| None | Extracts interactive examples to your local project. |

---

## 📚 Deep Architecture Documentation

To dive deeply into the advanced capabilities and API contracts, consult our dedicated architectural references:

* [The Forensic Autopsy](./docs/architecture/the-forensic-autopsy.md): Learn how to interpret the module cache dump during a crash.
* [Security & Redaction](./docs/architecture/security-and-redaction.md): Understand the $O(1)$ sanitizer, WeakSet protection, and the Hard Kill Switch.

---

## 🐛 Bug Reports

If you encounter an issue or bug, please report it to our official issue tracker:
[https://github.com/adriantoirawan/kepoin/issues](https://github.com/adriantoirawan/kepoin/issues)

📄 License
MIT © Adrianto Puji Irawan