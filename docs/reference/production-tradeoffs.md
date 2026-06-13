# Production Tradeoffs: Security and Performance Analysis

Using `kepoin` in a production environment introduces significant tradeoffs. While it is designed to be a zero-configuration forensic tool, **active tracing** (`KEPOIN_ENABLED=true`) in live environments requires a deep understanding of its operational constraints.

## 1. Security Analysis: Data Leakage & Sanitization

`kepoin` actively captures the execution state, including function arguments, return values, and local lexical scopes during crashes.

*   **Dictionary-Based Sanitization Risks:**
    `kepoin` ships with an $O(1)$ sanitization engine that redacts known keys (e.g., `password`, `token`, `ssn`). However, this is fundamentally an exclusionary (denylist) approach. If your application introduces a new sensitive variable (e.g., `stripe_payment_hash`), it will be logged in plain text unless explicitly added to the `--redact` flag. In strict compliance environments (GDPR, HIPAA, PCI-DSS), relying on a denylist for active data capturing is inherently risky.
*   **Lexical Scope Scraping:**
    When intercepting a crash, `kepoin` dumps the local variables in scope. This means even transient variables that are never explicitly logged could be captured and written to the output stream.

## 2. Performance Analysis: Execution Degradation

`kepoin` achieves its magic by dynamically proxying your module exports.

*   **Proxy Overhead & Object Serialization:**
    Every function call traced by `kepoin` is wrapped in a `Proxy`. The tool measures execution time and serializes the arguments and results up to the `--max-depth` limit (default: 4). In high-throughput scenarios (e.g., thousands of requests per second), this continuous serialization will block the Node.js event loop, increasing latency and reducing overall server throughput.
*   **V8 Inspector Deoptimization:**
    To achieve deep lexical scraping, `kepoin` dynamically connects to the `node:inspector`. Activating the V8 inspector disables certain compiler optimizations, leading to slower execution times and increased memory consumption. Repeated crashes that trigger the inspector hooks can cause cascading performance failures or Out-Of-Memory (OOM) errors.

## Conclusion

**`kepoin` is a deeply forensic tool optimized for developer experience.**

We heavily recommend using `kepoin` primarily in **Development** and **Staging** environments. 

If you must deploy it to production, use the Hard Kill Switch (`KEPOIN_ENABLED=false`) to maintain a strict 0% performance penalty, only enabling it dynamically or through threshold tracing (`--slow`) when diagnosing a specific anomaly.
