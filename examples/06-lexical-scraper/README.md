# Example 06: V8 Lexical Scope Scraper

This backend example demonstrates `kepoin`'s **V8 Introspector** and **Headless IPC** pipeline.

## The Magic
Standard error stack traces tell you *where* your code failed, but they lose the exact state of variables in memory at the time of the crash. 

When you run a script using `node --require kepoin/register` in headless mode, `kepoin` natively attaches to the `node:inspector`. Upon an unhandled exception, it pauses the V8 engine, climbs the call stack, and explicitly maps out the local scoped variables before gracefully dying!

## How to Run

Instead of manually starting the Hub and running the script, we built a tiny `orchestrator.js` script to demonstrate exactly how SaaS CLIs (like `reskyu`) consume `kepoin`.

Run the orchestrator:
```bash
node orchestrator.js
```

You will see the orchestrator catch the `kepoin:crash` JSON payload over IPC, extracting the local `localSecretToken` from the crashing function block!
