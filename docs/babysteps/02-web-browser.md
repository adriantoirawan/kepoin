# Babystep 02: Web Browsers (React / Vue / Vanilla)

Welcome! Let's connect your web application to the `kepoin` Socratic Hub in under 60 seconds.

By the end of this guide, any frontend crash or UI layout issue will be perfectly captured and beamed to your terminal.

## Step 1: Boot the Hub
Open your terminal and start the Telemetry Hub. It will listen on `ws://localhost:54321`.
```bash
npx kepoin listen
```

## Step 2: Install the Bridge
Inside your web project directory, install `kepoin`.
```bash
npm install kepoin
```

## Step 3: Inject the Bridge
Open your main entry file (e.g., `main.js`, `index.js`, or `App.vue`). Add the following lines:

```javascript
import { initKepoinBrowser } from 'kepoin/browser';
import { initPhantom } from 'kepoin/phantom';

// 1. Connects to ws://localhost:54321 and intercepts window.onerror
initKepoinBrowser();

// 2. Activates the Visual Debugger shortcut
initPhantom();
```

## Step 4: Trigger the Phantom Snapshot!
Sometimes your code doesn't throw a JavaScript error, but the CSS layout is completely broken (like a missing flexbox). 

Because you called `initPhantom()`, you can now use the Visual Debugger!
1. Hover your mouse directly over the visually broken element on your website.
2. Press `Option + Shift + R` (Mac) or `Alt + Shift + R` (Windows).
3. `kepoin` will instantly freeze the DOM, slice out the element, serialize it as a Base64 image using HTML5 Canvas, and stream it back to your `kepoin listen` terminal so you can pass it to your AI models!
