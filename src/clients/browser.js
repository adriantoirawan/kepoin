/**
 * kepoin/browser
 * 
 * Intercepts Browser errors, React ErrorBoundaries, and Vue Error Handlers.
 * Forwards telemetry to the kepoin Centralized Telemetry Hub.
 */

let ws = null;
let wsConnected = false;

export function initKepoinBrowser({ url = 'ws://localhost:54321' } = {}) {
  if (typeof window === 'undefined') return;

  function connect() {
    try {
      ws = new WebSocket(url);
      ws.onopen = () => { 
        wsConnected = true; 
        ws.send(JSON.stringify({
          type: 'kepoin:telemetry',
          payload: {
            status: 'Resolved',
            message: 'Universal Bridge connected successfully.',
            location: 'kepoin/browser',
            target: typeof window !== 'undefined' ? window.location.href : 'Unknown Client'
          }
        }));
      };
      ws.onclose = () => { wsConnected = false; };
      ws.onerror = () => { wsConnected = false; };
    } catch (e) {
      // Silent
    }
  }

  connect();

  function sendCrashPayload(errorMsg, stack, location) {
    const payload = {
      incidentLocation: location || window.location.href,
      errorMessage: errorMsg || 'Unknown Browser Error',
      errorStack: stack || undefined,
      timestamp: new Date().toISOString()
    };

    if (wsConnected && ws) {
      ws.send(JSON.stringify({ type: 'kepoin:crash', payload }));
    }
  }

  // Bind Native Window Error
  window.addEventListener('error', (event) => {
    const { message, filename, lineno, colno, error } = event;
    const location = `${filename}:${lineno}:${colno}`;
    sendCrashPayload(message, error?.stack, location);
  });

  // Bind Native Promise Rejection
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    sendCrashPayload(`Unhandled Promise: ${message}`, stack);
  });
}

// React ErrorBoundary Wrapper
export function withKepoinErrorBoundary(React, FallbackComponent = null) {
  return class KepoinErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      if (wsConnected && ws) {
        ws.send(JSON.stringify({
          type: 'kepoin:crash',
          payload: {
            incidentLocation: 'React Component Tree',
            errorMessage: error.message,
            errorStack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString()
          }
        }));
      }
    }

    render() {
      if (this.state.hasError) {
        if (FallbackComponent) {
          return React.createElement(FallbackComponent, { error: this.state.error });
        }
        return React.createElement('h1', null, 'Something went wrong.');
      }
      return this.props.children;
    }
  };
}

// Vue Plugin Wrapper
export const kepoinVuePlugin = {
  install(app) {
    const originalHandler = app.config.errorHandler;
    app.config.errorHandler = (err, vm, info) => {
      if (wsConnected && ws) {
        ws.send(JSON.stringify({
          type: 'kepoin:crash',
          payload: {
            incidentLocation: `Vue Component (${info})`,
            errorMessage: err.message,
            errorStack: err.stack,
            timestamp: new Date().toISOString()
          }
        }));
      }
      if (originalHandler) {
        originalHandler(err, vm, info);
      } else {
        console.error(err);
      }
    };
  }
};
