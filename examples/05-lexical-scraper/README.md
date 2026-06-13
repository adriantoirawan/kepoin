# Example 06: V8 Lexical Scope Scraper

This backend example demonstrates `kepoin`'s **V8 Forensic Autopsy**.

## The Magic
Standard error stack traces tell you *where* your code failed, but they lose the exact state of variables in memory at the time of the crash. 

When you run a script using `kepoin`, it natively attaches to the `node:inspector`. Upon an unhandled exception, it pauses the V8 engine, climbs the call stack, and explicitly maps out the local scoped variables before printing a glorious terminal autopsy!

## How to Run

Run the crash script:
```bash
npx kepoin crash.js
```

You will see `kepoin` catch the unhandled promise rejection, extract the local `localSecretToken` from the crashing function block, and print it to the terminal autopsy report!
