# The Forensic Autopsy

When a Node.js application crashes, the standard V8 stack trace tells you *where* the error happened. But it rarely tells you *why* it happened or *what* the application's memory state looked like at that exact millisecond.

`kepoin` solves this with the **Forensic Autopsy Engine**.

## How It Works

If your application throws an unhandled exception, `kepoin` intercepts the crash before the process dies and generates a comprehensive autopsy report.

### The Anatomy of an Autopsy

```plaintext
[controller.js:15] ▶ Executing: model.dbReadAllAuthors
[model.js:12] ▶ Executing: config.query
[model.js:12] ✔ Resolved:  config.query (+46.76ms)
[controller.js:15] ✖ Failed:    model.dbReadAllAuthors (+47.37ms) - Authors.createBulkAuthors is not a function

 🔍 TELEMETRY FORENSIC AUTOPSY REPORT 
💥 Incident Location: model.dbReadAllAuthors
💥 Error Message:     Authors.createBulkAuthors is not a function

--- Active Local Module Cache State ---
controller.js        ➔ [Class/Function] Static properties: ["getIndex","getAuthors"], Instance methods: []
model.js             ➔ [Class/Function] Static properties: ["dbReadAllAuthors","dbInsPost"], Instance methods: []
class.js             ➔ [Object Object] Keys: ["Authors","Post"]
------------------------------------------------
```

### 1. The Execution Waterfall
At the top of the autopsy, you will see the exact sequence of function calls that led to the crash. `kepoin` times every synchronous and asynchronous operation, revealing exactly what was happening leading up to the disaster.

### 2. The Module Cache State
The bottom section is the crown jewel of the Forensic Autopsy. `kepoin` dumps the live memory state of all locally loaded modules.

**Why is this useful?**
In the example above, the error is `Authors.createBulkAuthors is not a function`. 
By looking at the Module Cache State, you can see that `class.js` is exporting `[Object Object] Keys: ["Authors","Post"]`. 
This instantly reveals that the developer forgot to destructure the import (e.g., they did `const Authors = require('./class.js')` instead of `const { Authors } = require('./class.js')`).

You solved the bug in 5 seconds without ever opening a debugger!

## Emergency Synchronous Flush

If you are streaming logs to a file using the `--out` flag, `kepoin` writes data asynchronously to protect your event loop. However, during a fatal crash, the process is about to die. `kepoin` automatically detects this and triggers an **Emergency Synchronous Flush**, guaranteeing that your autopsy report hits the disk safely before Node.js exits.
