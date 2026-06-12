# Example 07: Time-Travel Dashcam

This example demonstrates `kepoin`'s $O(1)$ ring buffer for historical execution tracking.

## The Problem
If you log every single function execution in a large application, you will quickly cause a massive memory leak, crashing the Node.js process out of memory (OOM).

## The Solution
`kepoin` uses a strict circular ring buffer. It only holds onto the *trailing 1,000 frames* of execution. If your app runs for days, it constantly overwrites the oldest frames, ensuring memory usage stays perfectly flat and deterministic.

## How to Run

Run the script locally:
```bash
node dashcam.js
```

You will see it simulate 5,000 database query executions, but when it retrieves the history, it perfectly capped memory at exactly 1,000 frames!
