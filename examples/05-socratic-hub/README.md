# Example 05: The Socratic Hub Sandbox

This interactive sandbox demonstrates `kepoin`'s **Universal Frontend Bridge** and the **Phantom Snapshot** engine.

## How to Run

1. **Boot the Hub:** Open your terminal and run the Telemetry Hub to start listening for frontend payloads on `ws://localhost:54321`.
```bash
npx kepoin listen
```

2. **Serve the Frontend:** Open `index.html` in your web browser. (You can use Live Server, or simply open the file directly via `file://`).

3. **Interact:**
   - Click the "Throw TypeError" button. Watch the beautiful, verbose ANSI crash report instantly stream into your terminal!
   - Hover your mouse anywhere over the webpage and press `Option+Shift+R` (Mac) or `Alt+Shift+R` (Windows). This triggers the **Phantom Snapshot**. `kepoin` will serialize the DOM node under your cursor into a Base64 Canvas image and stream it to the Hub!
