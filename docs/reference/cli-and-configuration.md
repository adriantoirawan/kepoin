# CLI Flags & Configuration Guide

`kepoin` is designed to be a zero-configuration telemetry tool. However, it offers a powerful set of CLI flags and configuration options for advanced users.

## The CLI Flags

`kepoin` can be invoked in three modes:
1. **Target Mode:** `kepoin <script.js>` to execute and trace a specific file.
2. **Replay Mode:** `kepoin replay <file>.spil` to launch the Interactive Cinematic Replay Engine.
3. **Hub Mode:** `kepoin listen` to boot the Telemetry Hub (WebSocket server) for cross-platform ingestion.

| Flag/Command | Expects | Description & Use Case |
|---|---|---|
| `listen` | Command | **Boot the Telemetry Hub.** Starts a local WebSocket server (port `54321`) to receive payloads from mobile bridges. |
| `replay <file>` | Command | **Boot the Cinematic Replay Engine.** Playback `.spil` trace files dynamically. Features a `nano`-style control bar, adjustable speeds, and anomaly blast animations. |
| `--log-dir`, `-ld` | Directory | **APM Integrations.** Stream machine-readable JSONL logs to a directory for data crunching. |
| `--spill-dir`, `-sd` | Directory | **Human Readable Dumps.** Stream ANSI-stripped `.spil` logs to a directory for the Replay engine. |
| `--format` | `ansi` or `json` | **Force log format.** By default, `kepoin` uses ANSI colors for the terminal and JSON for files. Use this to override. |
| `--slow` | Milliseconds | **Threshold Tracing.** Only log functions that take longer than this threshold. Crucial for performance benchmarking and finding slow database queries. Example: `--slow=50` |
| `--max-depth` | Integer | **Override serialization depth.** Default is 4. Increase this if you need to see deeper into nested objects, or decrease to save memory. |
| `--redact` | Comma-separated strings | **Custom Redaction Dictionary.** Add extra object keys that should be scrubbed from the logs. Example: `--redact="api_key,ssn"` |
| `--verbose` | None | **Diagnostic Mode.** Prints internal `kepoin` logs showing exactly which modules and functions are being proxied. |
| `--disable` | None | **The Hard Kill Switch.** Bypasses all tracing entirely. Acts as a pure passthrough with 0% performance penalty. |
| `--examples` | None | Lists interactive examples bundled with the package. |
| `--init-examples` | None | Safely copies the interactive examples suite into your current project for local testing. |

## Environment Variables Mapping

Every CLI flag can be controlled via Environment Variables. This is perfect for injecting `kepoin` into existing scripts (like `npm run dev` or `nodemon`) using `NODE_OPTIONS="--require kepoin/register"`.

* `KEPOIN_LOG_DIR` ➔ Maps to `--log-dir` (`-ld`)
* `KEPOIN_SPILL_DIR` ➔ Maps to `--spill-dir` (`-sd`)
* `KEPOIN_FORMAT` ➔ Maps to `--format`
* `KEPOIN_SLOW_THRESHOLD` ➔ Maps to `--slow`
* `KEPOIN_MAX_DEPTH` ➔ Maps to `--max-depth`
* `KEPOIN_REDACT_KEYS` ➔ Maps to `--redact`
* `KEPOIN_VERBOSE` ➔ Maps to `--verbose`
* `KEPOIN_ENABLED` ➔ Maps to `--disable` (when set to `false`)

## Persistent Configuration (`kepoin.json`)

For teams that want to commit custom security dictionaries to source control, create a `kepoin.json` file in your project root:

```json
{
  "enabled": true,
  "logDir": "./logs",
  "spillDir": "./logs",
  "format": "ansi",
  "redactKeys": ["my_custom_internal_token", "aws_access_key"],
  "maxDepth": 5,
  "slowThreshold": 100
}
```

If a `kepoin.json` file contains invalid JSON, the library will gracefully warn you and fall back to the default settings rather than crashing your application.

---

## Further Reading & Support

* **[Production Tradeoffs Analysis](./production-tradeoffs.md):** Understand the security and performance implications of active tracing in production.
* **[Bug Reports](https://github.com/adriantoirawan/kepoin/issues):** Encountered an issue? Let us know on our official tracker.
