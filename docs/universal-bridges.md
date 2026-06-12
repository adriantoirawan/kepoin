# Universal Bridges & The Phantom Snapshot

`kepoin` v0.1.2 breaks out of the Node.js backend. We provide strict, native interception hooks to track errors across React Native, Expo, Vue, and React.

## 1. `kepoin/mobile`

Standard React Native `console.error` warnings do not provide adequate context for Socratic diagnostics. 
We provide a pure JavaScript core interceptor that overrides `global.ErrorUtils`.

### Installation
In your root `App.js` or `index.js`, add this to the top of the file:

```javascript
import { initKepoinMobile } from 'kepoin/mobile';

initKepoinMobile({
  fallback: false // Set to true if you want default RN Redbox screens to still trigger
});
```
When your Hermes or JSC engine throws a fatal exception, `kepoin` instantly wraps the stack trace into a JSON payload and beams it over a local WebSocket to your running `kepoin listen` hub.

## 2. `kepoin/browser`

To track standard browser DOM applications:

```javascript
import { initKepoinBrowser } from 'kepoin/browser';

initKepoinBrowser();
```
This safely binds to `window.onerror` and `window.addEventListener('unhandledrejection')`. 

## 3. The Phantom Snapshot (Visual Forensics)

Visual bugs (e.g., misaligned flexboxes, overflowing z-indexes) do not throw JavaScript exceptions. 

To solve this without forcing developers to download 150MB headless browser automation tools (like Puppeteer), `kepoin/browser` includes **The Phantom Snapshot** engine.

### Triggering the Phantom
Once `initKepoinBrowser()` is running, move your cursor over the broken visual element and press:
`Option + Shift + R` (Mac) or `Alt + Shift + R` (Windows)

### The Payload Extraction
1. `kepoin` uses `document.elementFromPoint(x,y)` to isolate the specific DOM node.
2. It aggressively serializes the node and its children into an XML string.
3. It maps `window.getComputedStyle()` to the element to grab its exact layout metrics.
4. Finally, it uses an SVG `<foreignObject>` to render the exact element onto an invisible HTML5 `<canvas>`, extracting a beautiful `data:image/jpeg;base64` visual snapshot.

This base64 string is wrapped into the `kepoin:telemetry` schema and sent to the Hub, allowing AI Socratic models (like `reskyu`) to actually **see** your broken CSS in real-time.
