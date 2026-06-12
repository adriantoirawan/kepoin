/**
 * kepoin/dashcam
 * 
 * Time-Travel Telemetry Engine.
 * Maintains a strict, fixed-size circular buffer of execution frames.
 * Prevents memory inflation on low-spec hardware while allowing
 * the reskyu Socratic AI to scrub backward through execution history.
 */

import inspector from 'node:inspector';
import { getConfig } from '../utils/config.js';

const BUFFER_SIZE = 1000;
const ringBuffer = new Array(BUFFER_SIZE);
let head = 0;
let count = 0;

export function pushFrame(frame) {
  ringBuffer[head] = frame;
  head = (head + 1) % BUFFER_SIZE;
  if (count < BUFFER_SIZE) count++;
}

export function getHistory() {
  const history = [];
  let index = count < BUFFER_SIZE ? 0 : head;
  for (let i = 0; i < count; i++) {
    history.push(ringBuffer[index]);
    index = (index + 1) % BUFFER_SIZE;
  }
  return history;
}

let session = null;

export function initDashcam() {
  const config = getConfig();
  if (!config.enabled) return;

  try {
    session = new inspector.Session();
    session.connect();

    // To prevent severe performance degradation, we do not step-execute.
    // Instead, we use the Runtime domain to capture console APIs,
    // and rely on kepoin's proxy telemetry to push frames.
    session.post('Runtime.enable');
    
    session.on('Runtime.consoleAPICalled', (message) => {
      const { type, args, stackTrace, timestamp } = message.params;
      const location = stackTrace?.callFrames[0];
      
      pushFrame({
        event: 'console',
        type,
        location: location ? `${location.url}:${location.lineNumber}` : 'Unknown',
        timestamp
      });
    });

    if (config.verbose) {
      console.error(`\x1b[90m[kepoin:dashcam]\x1b[0m Time-Travel Dashcam active. Ring buffer size: ${BUFFER_SIZE}`);
    }
  } catch (err) {
    if (config.verbose) {
      console.error(`\x1b[90m[kepoin:dashcam]\x1b[0m Failed to attach inspector for Dashcam: ${err.message}`);
    }
  }
}
