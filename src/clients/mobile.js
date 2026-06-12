/**
 * kepoin/mobile
 * 
 * Intercepts React Native and Expo (Hermes/JSC) crashes and forwards them 
 * to the kepoin Centralized Telemetry Hub via WebSocket.
 */

export function initKepoinMobile({ url = 'ws://localhost:54321', fallback = true } = {}) {
  if (typeof global === 'undefined' || !global.ErrorUtils) {
    console.warn('[kepoin] ErrorUtils not found. Are you sure you are in a React Native environment?');
    return;
  }

  const originalHandler = global.ErrorUtils.getGlobalHandler();
  let ws = null;
  let wsConnected = false;

  function connect() {
    try {
      ws = new WebSocket(url);
      ws.onopen = () => { wsConnected = true; };
      ws.onclose = () => { wsConnected = false; };
      ws.onerror = () => { wsConnected = false; };
    } catch (e) {
      // Ignore websocket connection errors
    }
  }

  connect();

  function sendCrashPayload(error, isFatal) {
    const payload = {
      incidentLocation: 'Mobile Runtime',
      errorMessage: error ? error.message : 'Unknown React Native Error',
      errorStack: error ? error.stack : undefined,
      isFatal,
      timestamp: new Date().toISOString()
    };

    if (wsConnected && ws) {
      try {
        ws.send(JSON.stringify({ type: 'kepoin:crash', payload }));
      } catch (e) {
        // Silent
      }
    } else {
      // If websocket isn't connected, we can't do much without a UI, 
      // but kepoin aims to be silent here.
    }
  }

  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    sendCrashPayload(error, isFatal);

    if (fallback && originalHandler) {
      originalHandler(error, isFatal);
    }
  });

  return {
    sendTelemetry(eventName, data) {
      if (wsConnected && ws) {
        ws.send(JSON.stringify({ 
          type: 'kepoin:telemetry', 
          payload: { status: 'Event', target: eventName, ...data } 
        }));
      }
    }
  };
}
