# 🕵️ kepoin

> **Nosy by nature. Forensic by design. Obsessively verbose event recording for modern applications.**

![npm](https://img.shields.io/npm/v/kepoin?color=cyan&label=npm%20install%20kepoin)
![node-current](https://img.shields.io/node/v/kepoin?color=green)
![license](https://img.shields.io/npm/l/kepoin)

**kepoin** is a zero-configuration, universal telemetry and forensic diagnostics hub for Node.js and Mobile Runtimes. 

**No messy `console.log` statements. No complex APM setup. Zero mutations to your business logic.**

When you run `kepoin`, our **Time-Capped Asynchronous Bootloader** fires up instantly, painting a gorgeous ASCII diagnostic banner while checking for updates without *ever* delaying your application's start time.

> [!TIP]
> **Production Environments:** kepoin is deeply forensic. Active tracing in production involves performance & security tradeoffs. Read our [Production Tradeoffs Analysis](./docs/reference/production-tradeoffs.md) before deploying.

---

## 🌟 Key Features

### 1. The Centralized Telemetry Hub
`kepoin listen` boots a blazing-fast local WebSocket server that aggregates crash reports and diagnostics from mobile applications into a single beautifully colored terminal stream, or NDJSON file output.

### 2. V8 Lexical Scope Scraper (Backend)
Standard Node.js crash traces tell you *where* the app died. `kepoin` tells you *why*.
By booting with `--require kepoin/register`, our engine programmatically hooks into `node:inspector` upon crashing, safely dumping the **local variables and lexical scope** mapped to the exact line of failure.

### 3. Mobile App Crash Bridges

> [!WARNING]
> **Experimental:** Mobile support is currently experimental and subject to change.

We provide import-safe, zero-config hooks that intercept unhandled exceptions before frameworks swallow them.
* **`import 'kepoin/mobile'`**: Natively binds to JavaScriptCore/Hermes `global.ErrorUtils` for React Native & Expo, streaming crash autopsies directly back to the Hub on your local machine.

---

## 🛡️ Security & Zero-Gravity Hardware Mandates

Because `kepoin` recursively proxies and tracks the execution pipeline, it strictly enforces hardware constraints to maintain a 0% performance penalty.
* **Dynamic Data Redaction:** An $O(1)$ sanitization engine immediately redacts sensitive keys (`password`, `token`, etc.).
* **The Production Kill Switch:** Setting `KEPOIN_ENABLED=false` acts as a zero-overhead Hard Kill Switch.

---

## 📦 Installation

```bash
# Install globally (Recommended for CLI Hub usage)
npm install -g kepoin

# OR install locally as a dev dependency
npm install kepoin --save-dev
```

---

## 👶 The Babystep Guides (Start Here)

To make integration absolutely frictionless, we have split our documentation into step-by-step guides. If you are new to `kepoin`, start with the guide that matches your stack:

* [01. React Native & Mobile Apps](./docs/babysteps/01-react-native-mobile.md)
* [02. Node.js Backends](./docs/babysteps/03-nodejs-backend.md)

---

## 🚀 Usage Quickstart

### 1. Booting the Hub
```bash
# Start the Standalone Telemetry Hub
npx kepoin listen
```

### 2. Injecting into Backend Node.js
Do not mutate your source code. Inject `kepoin` via Node environment variables.
```bash
# Mac/Linux
NODE_OPTIONS="--require kepoin/register" npm run start
```

> [!NOTE]
> **The Module Boundary:** To maintain 0% performance overhead, `kepoin` operates by wrapping your `module.exports`. This means it only traces **exported functions** that are imported and called from **another file**. It does *not* trace local function calls executing internally within the same file.

### 3. Injecting into Mobile (React Native/Expo)

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
| `--out=<file>` | Filepath | **Stream logs to a file.** Useful for piping NDJSON to Datadog. |
| `--slow=<ms>` | Milliseconds | **Threshold Tracing.** Only log functions that take longer than this threshold. |
| `--max-depth=<N>` | Integer | **Override serialization depth.** Default is 4. |
| `--redact=<keys>` | Strings | **Custom Redaction Dictionary.** Add extra keys to scrub. |
| `--disable` | None | **The Hard Kill Switch.** Bypasses all tracing entirely. |
| `--examples` | None | Lists interactive examples bundled with the package. |
| `--init-examples`| None | Extracts interactive examples to your local project. |

---

## 🎮 Interactive Tutorial Suite

You do not need to clone this repository! Just install `kepoin` globally and run the examples wizard anywhere on your computer:

```bash
# Safely copy the interactive examples into your current directory
npx kepoin --init-examples

# List the commands to run them!
npx kepoin --examples
```

Inside the extracted `examples/` folder, you will find incredibly powerful demonstrations:
* **01-crash-autopsy:** Demonstrates default tracking, circular reference protection, and the Forensic Autopsy engine by intentionally crashing a simulated database.
* **06-lexical-scraper:** Demonstrates `kepoin` natively intercepting V8 and dumping out local scoped variables (`{ superSecretToken: 'abc' }`) during a backend crash.

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