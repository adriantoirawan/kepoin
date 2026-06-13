import { WebSocketServer } from 'ws';
import http from 'node:http';
import { logEvent, emergencySyncFlush } from '../utils/logger.js';
import { getConfig } from '../utils/config.js';

export function startHub(env) {
  const config = getConfig();
  const port = config.wsPort || 54321;

  const server = http.createServer((req, res) => {
    res.writeHead(404);
    res.end('Not Found');
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    if (config.verbose) {
      console.error(`\x1b[90m[kepoin:hub]\x1b[0m Client connected on port ${port}`);
    }

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'kepoin:crash') {
          emergencySyncFlush(data.payload);
        } else if (data.type === 'kepoin:telemetry') {
          logEvent(data.payload);
        } else {
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
      if (config.verbose) console.error(`\x1b[90m[kepoin:hub]\x1b[0m WebSocket error: ${err.message}`);
    });
  });

  server.listen(port, () => {
    console.log(`\x1b[36m[kepoin:hub]\x1b[0m Centralized Telemetry Hub listening on \x1b[1mws://localhost:${port}\x1b[0m`);
  });

  server.on('error', (err) => {
    console.error(`\x1b[31m[kepoin:hub:error]\x1b[0m Failed to start server: ${err.message}`);
    process.exit(1);
  });
}
