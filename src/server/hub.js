import { WebSocketServer } from 'ws';
import { logEvent, emergencySyncFlush } from '../utils/logger.js';
import { getConfig } from '../utils/config.js';

export function startHub(env) {
  // Ensure the config is loaded
  const config = getConfig();
  const port = config.wsPort || 54321;

  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws) => {
    if (config.verbose) {
      console.error(`\x1b[90m[kepoin:hub]\x1b[0m Client connected on port ${port}`);
    }

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        // Handle different payload types from Mobile/Browser/Phantom clients
        if (data.type === 'kepoin:crash') {
          emergencySyncFlush(data.payload);
        } else if (data.type === 'kepoin:telemetry') {
          logEvent(data.payload);
        } else {
          // Fallback or custom telemetry
          logEvent({
            status: 'Received',
            message: data.payload?.message || 'Unknown Payload',
            target: 'Telemetry Hub',
            ...data.payload
          });
        }
      } catch (err) {
        if (config.verbose) {
          console.error(`\x1b[90m[kepoin:hub]\x1b[0m Failed to parse message: ${err.message}`);
        }
      }
    });

    ws.on('error', (err) => {
      if (config.verbose) {
        console.error(`\x1b[90m[kepoin:hub]\x1b[0m WebSocket error: ${err.message}`);
      }
    });
  });

  wss.on('listening', () => {
    if (!config.isHeadless) {
      console.log(`\x1b[36m[kepoin:hub]\x1b[0m Centralized Telemetry Hub listening on \x1b[1mws://localhost:${port}\x1b[0m`);
    }
  });

  wss.on('error', (err) => {
    console.error(`\x1b[31m[kepoin:hub:error]\x1b[0m Failed to start server: ${err.message}`);
    process.exit(1);
  });
}
