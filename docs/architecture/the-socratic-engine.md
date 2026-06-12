# The Socratic Engine Architecture

The Socratic Engine architecture forms the backbone of `kepoin` v0.1.10. It marks the transition of `kepoin` from a simple forensic logger to a universal telemetry proxy capable of serving massive orchestrators (like `reskyu`).

## 1. The Headless IPC Pipeline

While `kepoin listen` acts as a gorgeous, verbose Standalone Telemetry Hub for normal development, appending `--headless` flips the kill switch on all ANSI formatting and `process.stdout` usage.

```bash
kepoin listen --headless
```

When spawned by an orchestrator, `kepoin` silently establishes a WebSockets server to collect events from frontend clients, but it strictly routes those payloads down a native Node.js IPC channel (`process.send()`) back to the orchestrator. This guarantees `kepoin` operates at absolute zero visual overhead and won't shatter your TUI.

## 2. Size-Based Zlib Deflation

**Cloud Egress Optimization** is critical. A normal JSON stack trace payload might be 2KB. But a Phantom Snapshot containing a Base64 serialized Canvas DOM slice can easily eclipse 500KB.

To protect bandwidth without sacrificing performance on tiny payloads, `kepoin` leverages dynamic deflation:
1. `kepoin` parses an incoming frontend payload.
2. It stringifies the JSON.
3. If `length > 50,000` bytes, `kepoin` triggers `zlib.deflateSync()`.
4. It wraps the deflated buffer in a base64 string, and emits it over IPC utilizing the `KepoinCompressedEnvelope` schema.

The orchestrator simply intercepts this envelope:
```javascript
if (msg.type === 'kepoin:compressed') {
  const rawPayload = zlib.inflateSync(Buffer.from(msg.data, 'base64')).toString();
  // Safe to parse and upload!
}
```

## 3. The Official Socratic Payload Schema

If you are building a tool that consumes `kepoin` (like `reskyu`), you must respect these exact schema definitions.

### `KepoinCrashPayload`
Fired exclusively when `kepoin/register`, `kepoin/browser`, or `kepoin/mobile` catches a fatal exception.

> [!TIP]
> **Test it Locally:** Run our [06-lexical-scraper example](../../examples/06-lexical-scraper/) to see the orchestrator catch this exact payload over IPC and extract local scoped variables!

```typescript
{
  type: 'kepoin:crash',
  timestamp: string,
  incidentLocation: string,
  errorMessage: string,
  errorStack: string,
  localVariables: Record<string, any> // (Node.js backend only)
}
```

### `KepoinTelemetryPayload`
Fired during manual proxy logging, or via the Dashcam ring-buffer tracking.
```typescript
{
  type: 'kepoin:telemetry',
  timestamp: string,
  status: string,
  target: string,
  message: string
}
```
