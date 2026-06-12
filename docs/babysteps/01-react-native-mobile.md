# Babystep 01: React Native & Expo Mobile App

Welcome! Let's connect your React Native mobile application to the `kepoin` Socratic Hub in under 60 seconds. 

By the end of this guide, any fatal crash on your phone will magically appear on your computer with full stack trace context.

## Step 1: Boot the Hub
Open your terminal and boot the `kepoin` Telemetry Hub. It will listen on `ws://localhost:54321`.
```bash
npx kepoin listen
```

## Step 2: Install the Bridge
Inside your React Native / Expo project directory, install `kepoin`.
```bash
npm install kepoin
```

## Step 3: Inject the Bridge
Open your `App.js` or `index.js` file. Add the following lines **at the very top** before any other imports:

```javascript
import { initKepoinMobile } from 'kepoin/mobile';

// Replace 10.0.2.2 with your computer's local IP if you are testing on a physical iPhone/Android device on WiFi!
initKepoinMobile({
  fallback: false, // Prevents the default red screen of death from appearing
  port: 54321,
  host: '10.0.2.2' // Magic Android emulator localhost forwarding IP
});

// The rest of your app code...
import React from 'react';
```

## Step 4: Test the Connection
Intentionally write some bad code inside a `useEffect` or an `onPress` handler:
```javascript
<Button title="Crash Me" onPress={() => { nonexistentFunction() }} />
```
Tap the button. Your app will silently fail, but if you look at your terminal where `kepoin listen` is running, you will see a gorgeous crash payload!
