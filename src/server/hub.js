import { WebSocketServer } from 'ws';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logEvent, emergencySyncFlush } from '../utils/logger.js';
import { getConfig } from '../utils/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function startHub(env) {
  const config = getConfig();
  const port = config.wsPort || 54321;

  const server = http.createServer((req, res) => {
    if (req.url === '/kepoin.js') {
      try {
        const browserCode = fs.readFileSync(path.join(__dirname, '../clients/browser.js'), 'utf8');
        const phantomCode = fs.readFileSync(path.join(__dirname, '../clients/phantom.js'), 'utf8');
        
        // Strip out the 'export ' keywords so it runs purely in the browser global scope
        const strippedBrowser = browserCode.replace(/export function/g, 'function').replace(/export const/g, 'const');
        const strippedPhantom = phantomCode.replace(/export function/g, 'function');
        
        const bundledCode = `
          // kepoin Universal Browser CDN Bundle
          (function() {
            ${strippedBrowser}
            ${strippedPhantom}
            
            // Auto-Initialize
            initKepoinBrowser();
            initPhantom();
            console.log('[kepoin] Universal Bridge Connected.');
          })();
        `;
        
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(bundledCode);
      } catch (err) {
        res.writeHead(500);
        res.end('Failed to load kepoin.js');
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
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
    if (!config.isHeadless) {
      console.log(`\x1b[36m[kepoin:hub]\x1b[0m Centralized Telemetry Hub listening on \x1b[1mws://localhost:${port}\x1b[0m`);
      console.log(`\x1b[36m[kepoin:cdn]\x1b[0m Vanilla CDN Active at \x1b[1mhttp://localhost:${port}/kepoin.js\x1b[0m`);
    }
  });

  server.on('error', (err) => {
    console.error(`\x1b[31m[kepoin:hub:error]\x1b[0m Failed to start server: ${err.message}`);
    process.exit(1);
  });
}
