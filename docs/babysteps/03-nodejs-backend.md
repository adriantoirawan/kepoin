# Babystep 03: Node.js Backend

Welcome! Let's instrument your existing Node.js backend (Express, Nest, Fastify) with `kepoin`. 

**Unlike frontend apps, you do not need to change your source code to use `kepoin` on the backend.**

## Step 1: Install
```bash
npm install kepoin
```

## Step 2: The Stealth Injector (`--require`)
Instead of running `node server.js`, use the `--require` flag to natively attach the `kepoin` V8 proxy.

```bash
node --require kepoin/register server.js
```
Alternatively, if you use `npm run dev` with `nodemon`, simply prepend `NODE_OPTIONS`:
```bash
NODE_OPTIONS="--require kepoin/register" npm run dev
```

## Step 3: View the Autopsy!
If your `server.js` throws an unhandled error (e.g., `Cannot read properties of undefined (reading 'id')`), your terminal will automatically print a **Forensic Autopsy**. This autopsy dumps the exact V8 Module Cache, letting you see exactly what exports were active at the exact millisecond of the crash.

## Step 4 (Advanced): The Time-Travel Dashcam
To prevent Memory Leaks when logging dense backend traffic, `kepoin` provides an $O(1)$ ring buffer. You can push thousands of events, but it will safely truncate to the trailing 1,000 frames.

You can implement it manually anywhere in your code:
```javascript
import { initDashcam, pushFrame } from 'kepoin/dashcam';

initDashcam();

app.get('/users/:id', (req, res) => {
  pushFrame({
    event: 'API Request',
    location: `/users/${req.params.id}`,
    timestamp: Date.now()
  });
  
  // If the server crashes later, you'll be able to see the last 1000 requests!
});
```
