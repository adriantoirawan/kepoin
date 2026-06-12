# 🕵️ kepoin (The Obsessively Verbose Event Recorder)

> **Nosy by nature. Forensic by design. Obsessively verbose event recording for modern applications.**

![npm](https://img.shields.io/npm/v/kepoin?color=cyan&label=npm%20install%20kepoin)
![node-current](https://img.shields.io/node/v/kepoin?color=green)
![license](https://img.shields.io/npm/l/kepoin)

**kepoin** is a zero-configuration, universal telemetry and forensic diagnostics hub for Node.js, Web Browsers, and Mobile Runtimes. 

Originally built as a standalone terminal logger to replace `console.log`, `kepoin` has evolved into a **Universal Telemetry Hub** that natively supports cross-platform IPC piping, multimodal Socratic Snapshotting, and time-travel dashcam traces. 

**No messy `console.log` statements. No complex APM setup. Zero mutations to your business logic.**

When you run `kepoin`, our **Time-Capped Asynchronous Bootloader** fires up instantly, painting a gorgeous ASCII diagnostic banner while checking for updates without *ever* delaying your application's start time.

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
We provide import-safe, zero-config hooks that intercept unhandled exceptions before frameworks swallow them. Whether you use a heavy Webpack bundler or write pure Vanilla HTML, we've got you covered:
* **`import 'kepoin/mobile'`**: Natively binds to JavaScriptCore/Hermes `global.ErrorUtils` for React Native & Expo.
* **`import 'kepoin/browser'`**: Captures `window.onerror`, React `ErrorBoundary`, and Vue's `app.config.errorHandler`.
* **The Universal CDN**: Not using a bundler? Simply drop `<script src="http://localhost:54321/kepoin.js"></script>` into your EJS or HTML file. The Hub dynamically strips ES modules and beams the fully armed telemetry payload straight to your browser.

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

## 👶 The Babystep Guides (Start Here)

To make integration absolutely frictionless, we have split our documentation into step-by-step guides. If you are new to `kepoin`, start with the guide that matches your stack:

* [01. React Native & Mobile Apps](./docs/babysteps/01-react-native-mobile.md)
* [02. Web Browsers (React/Vue/Vanilla)](./docs/babysteps/02-web-browser.md)
* [03. Node.js Backends](./docs/babysteps/03-nodejs-backend.md)

---

## 🚀 Usage Quickstart

### 1. Booting the Hub
```bash
# Start the Standalone Telemetry Hub
npx kepoin listen

# Start the Headless SaaS IPC Hub
npx kepoin listen --headless
```

### 2. Injecting into Backend Node.js
Do not mutate your source code. Inject `kepoin` via Node environment variables.
```bash
# Mac/Linux
NODE_OPTIONS="--require kepoin/register" npm run start
```

> [!NOTE]
> **The Module Boundary:** To maintain 0% performance overhead, `kepoin` operates by wrapping your `module.exports`. This means it only traces **exported functions** that are imported and called from **another file**. It does *not* trace local function calls executing internally within the same file.

### 3. Injecting into Frontend (React/Vue/Browser)
If you use a bundler (Vite/Webpack), import the adapter at the very top of your `index.js` or `main.js`:
```javascript
import { initKepoinBrowser } from 'kepoin/browser';

// Starts interception and connects to the local Hub!
initKepoinBrowser();
```
If you are writing pure Vanilla HTML, Express, or EJS, bypass the bundler entirely by dropping this into your `<head>`:
```html
<script src="http://localhost:54321/kepoin.js"></script>
```

### 4. Injecting into Mobile (React Native/Expo)
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
| `--headless` | Flag | **The IPC Hub Mode.** Can only be used with `listen`. Suppresses all ANSI terminal output and routes telemetry via IPC. |
| `--out=<file>` | Filepath | **Stream logs to a file.** Useful for piping NDJSON to Datadog. |
| `--slow=<ms>` | Milliseconds | **Threshold Tracing.** Only log functions that take longer than this threshold. |
| `--max-depth=<N>` | Integer | **Override serialization depth.** Default is 4. |
| `--redact=<keys>` | Strings | **Custom Redaction Dictionary.** Add extra keys to scrub. |
| `--disable` | None | **The Hard Kill Switch.** Bypasses all tracing entirely. |
| `--examples` | None | Lists interactive examples bundled with the package. |
| `--init-examples`| None | Extracts interactive examples to your local project. |

---

## 🎮 Interactive Tutorial Suite

Want to see the Socratic Hub in action before integrating it into your code? `kepoin` ships with a built-in suite of interactive sandboxes.

You do not need to clone this repository! Just install `kepoin` globally and run the examples wizard anywhere on your computer:

```bash
# Safely copy the interactive examples into your current directory
npx kepoin --init-examples

# List the commands to run them!
npx kepoin --examples
```

Inside the extracted `examples/` folder, you will find incredibly powerful demonstrations:
* **05-socratic-hub:** Open a beautiful HTML sandbox, click buttons to crash the browser, and watch the Phantom Snapshot stream over WebSocket to your terminal!
* **06-lexical-scraper:** Run our headless orchestrator to see how `kepoin` natively intercepts V8 and dumps out local scoped variables (`{ superSecretToken: 'abc' }`) during a backend crash.
* **07-time-travel-dashcam:** Run a script that loops 5,000 times to see exactly how the $O(1)$ Dashcam array truncates memory dynamically.

---

## 📚 Deep Architecture Documentation

To dive deeply into the advanced Socratic Engine capabilities and API contracts, consult our dedicated architectural references:

* [The Socratic Engine Architecture](./docs/architecture/the-socratic-engine.md): Learn about IPC piping, Zlib deflation, and the `kepoin:crash` Schema.
* [The Forensic Autopsy](./docs/architecture/the-forensic-autopsy.md): Learn how to interpret the module cache dump during a crash.
* [Security & Redaction](./docs/architecture/security-and-redaction.md): Understand the $O(1)$ sanitizer, WeakSet protection, and the Hard Kill Switch.

📄 License
MIT © Adrianto Puji Irawan