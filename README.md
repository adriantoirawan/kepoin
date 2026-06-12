# 🕵️ kepoin (The Universal Socratic Engine)

> **Nosy by nature. Forensic by design. The invisible backbone of modern telemetry.**

![npm](https://img.shields.io/npm/v/kepoin?color=cyan&label=npm%20install%20kepoin)
![node-current](https://img.shields.io/node/v/kepoin?color=green)
![license](https://img.shields.io/npm/l/kepoin)

**kepoin** is a zero-configuration, universal telemetry and forensic diagnostics hub for Node.js, Web Browsers, and Mobile Runtimes. 

Originally built as a standalone terminal logger to replace `console.log`, `kepoin` has evolved into a **Universal Telemetry Hub** that natively supports cross-platform IPC piping, multimodal Socratic Snapshotting, and time-travel dashcam traces. 

**No messy `console.log` statements. No complex APM setup. Zero mutations to your business logic.**

---

## 🌟 Key Features

### 1. The Centralized Telemetry Hub
`kepoin listen` boots a blazing-fast local WebSocket server that aggregates crash reports, memory autopsies, and visual diagnostics from *any* frontend device into a single beautifully colored terminal stream.
* **Standalone Mode:** Flawless DX for developers debugging complex React Native or Vue applications.
* **Headless IPC Pipeline:** Run `kepoin listen --headless` to instantly mute terminal output and strictly pipe compressed JSON events over `process.send()`, turning `kepoin` into an invisible, highly-optimized data engine for SaaS orchestration platforms (like `reskyu`).

### 2. V8 Lexical Scope Scraper (Backend)
Standard Node.js crash traces tell you *where* the app died. `kepoin` tells you *why*.
By booting with `--require kepoin/register`, our engine programmatically hooks into `node:inspector` upon crashing, safely dumping the **local variables and lexical scope** mapped to the exact line of failure.

### 3. Universal Frontend Bridges (Mobile & Web)
We provide import-safe, zero-config hooks that intercept unhandled exceptions before frameworks swallow them:
* **`import 'kepoin/mobile'`**: Natively binds to JavaScriptCore/Hermes `global.ErrorUtils` for React Native & Expo.
* **`import 'kepoin/browser'`**: Captures `window.onerror`, React `ErrorBoundary`, and Vue's `app.config.errorHandler`.

### 4. The Phantom Snapshot (Multimodal UI Slicer)
Visual CSS/layout bugs don't throw console exceptions. To give your debugging AI "eyes", trigger `Option+Shift+R` in the browser bridge. The Phantom Engine serializes the exact DOM node under the cursor, extracts computed CSS styles, and generates a massive, Zlib-compressed Base64 Canvas Payload directly over WebSocket without any heavy Playwright automation.

### 5. Time-Travel Dashcam
Memory leaks and race conditions are solved by seeing the past. `kepoin` manages a strict, $O(1)$ ring-buffer tracking the last 1,000 application frames, enabling a deterministic "dashcam" trace leading up to any application crash.

---

## 🛡️ Security & Zero-Gravity Hardware Mandates

Because `kepoin` recursively proxies and tracks the execution pipeline, it strictly enforces hardware constraints to maintain a 0% performance penalty.
* **Dynamic Data Redaction:** An $O(1)$ sanitization engine immediately redacts sensitive keys (`password`, `token`, etc.).
* **Size-Based Zlib Deflation:** Massive IPC payloads (like the Phantom Snapshot Base64 strings) are automatically compressed natively by the Hub before transit, saving massive Cloud Egress bandwidth.
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

## 🚀 Usage Guide

### 1. Booting the Hub
```bash
# Start the Standalone Telemetry Hub
kepoin listen

# Start the Headless SaaS IPC Hub
kepoin listen --headless
```

### 2. Injecting into Backend Node.js
Do not mutate your source code. Inject `kepoin` via Node environment variables.
```bash
# Mac/Linux
NODE_OPTIONS="--require kepoin/register" npm run start
```

### 3. Injecting into Frontend (React/Vue/Browser)
Import the adapter at the very top of your `index.js` or `main.js`:
```javascript
import { initKepoinBrowser } from 'kepoin/browser';

// Starts interception and connects to the local Hub!
initKepoinBrowser();
```

### 4. Injecting into Mobile (React Native/Expo)
Import the mobile adapter in `App.js`:
```javascript
import { initKepoinMobile } from 'kepoin/mobile';

initKepoinMobile();
```

---

## 📚 Comprehensive Architecture Documentation

To dive deeply into the advanced Socratic Engine capabilities and API contracts, consult our dedicated documentation:
* [The Socratic Engine Architecture](./docs/the-socratic-engine.md): Learn about IPC piping, Zlib deflation, and the `kepoin:crash` Schema.
* [Universal Bridges & Phantom Snapshots](./docs/universal-bridges.md): Learn how `kepoin` handles frontend interception.
* [CLI & Configuration Guide](./docs/cli-and-configuration.md): Master the `kepoin listen` flags and `kepoin.json` overrides.
* [Security & Redaction](./docs/security-and-redaction.md): Understand the V8 safety limitations and manual truncation rules.

📄 License
MIT © Adrianto Puji Irawan