# Security and Data Redaction

Because `kepoin` recursively proxies and records function calls, arguments, and memory states, it operates with the highest level of data access. 

By default, `kepoin` is engineered to protect your sensitive data and infrastructure.

## $O(1)$ Dynamic Data Redaction

When intercepting complex objects (such as HTTP request payloads or database query results), scanning every string value for sensitive data using Regular Expressions creates a massive performance bottleneck.

Instead, `kepoin` utilizes an **$O(1)$ key-based sanitization engine**. It automatically checks the keys of your objects against a highly optimized `Set`. If a key matches, its value is scrubbed *before* it is ever serialized to disk.

### The Default Dictionary
Out of the box, `kepoin` redacts the following keys automatically:
- `password`
- `token`
- `authorization`
- `secret`
- `stripe_key`
- `api_key`

### Extending the Dictionary
If your application uses proprietary keys for sensitive data, you can extend the redaction dictionary effortlessly.

**Via CLI:**
```bash
kepoin --redact="ssn,credit_card,medical_record" server.js
```

**Via `kepoin.json`:**
```json
{
  "redactKeys": ["ssn", "credit_card", "medical_record"]
}
```

## Denial of Service (DoS) Protection

Logging frameworks often crash the application they are trying to monitor. `kepoin` prevents this through two architectural safeguards:

### 1. WeakSet Circular Reference Protection
Deeply nested objects often reference themselves (e.g., `req.socket._httpMessage.req`). Attempting to serialize these structures will cause a `TypeError: Converting circular structure to JSON`.

`kepoin` uses a `WeakSet` registry during telemetry serialization. As it traverses the object tree, it safely bypasses circular references by replacing them with the string `"[Circular Reference]"`. Because it uses a `WeakSet`, it does not prevent the V8 engine from garbage collecting dead objects, completely eliminating memory leak risks.

### 2. Maximum Depth Limiter
To prevent massive payloads from hanging the V8 event loop during serialization, `kepoin` enforces a strict **Maximum Depth Limiter** (default: 4 levels deep). Any data beyond this depth is truncated safely to `[Object]`.

You can override this limit if needed:
```bash
kepoin --max-depth=6 server.js
```

## The Hard Kill Switch

`kepoin` is strictly designed for local development, debugging, and secure staging environments. 

If it is accidentally deployed to production, or if you simply want to turn off tracing temporarily without altering your `package.json` scripts, you can use the Hard Kill Switch:

```bash
KEPOIN_ENABLED=false npm run start
```

When disabled, `kepoin` aborts all proxy generation and hook registration. It acts as a pure passthrough with a guaranteed **0% performance penalty**.
