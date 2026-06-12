/**
 * kepoin/phantom
 * 
 * Socratic Co-Pilot Visual Engine.
 * Captures structural DOM and CSS context, along with a Base64 visual slice
 * when the developer triggers Option+Shift+R over an element.
 */

export function initPhantom({ url = 'ws://localhost:54321' } = {}) {
  if (typeof window === 'undefined') return;

  let ws = null;
  let wsConnected = false;
  let mouseX = 0;
  let mouseY = 0;

  function connect() {
    try {
      ws = new WebSocket(url);
      ws.onopen = () => { 
        wsConnected = true;
        ws.send(JSON.stringify({
          type: 'kepoin:telemetry',
          payload: {
            status: 'Resolved',
            message: 'Phantom Snapshot Engine armed (Alt+Shift+R).',
            location: 'kepoin/phantom',
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

  // Track mouse coordinates for elementFromPoint
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function extractComputedStyles(element) {
    const styles = window.getComputedStyle(element);
    return {
      display: styles.display,
      position: styles.position,
      flexDirection: styles.flexDirection,
      justifyContent: styles.justifyContent,
      alignItems: styles.alignItems,
      width: styles.width,
      height: styles.height,
      margin: styles.margin,
      padding: styles.padding,
      zIndex: styles.zIndex,
      color: styles.color,
      backgroundColor: styles.backgroundColor
    };
  }

  // Option + Shift + R (Alt + Shift + R)
  window.addEventListener('keydown', (e) => {
    // Debug log to trace OS level key interception
    if (e.shiftKey && e.code === 'KeyR') {
      console.log('[kepoin:phantom] Shift+R detected. altKey:', e.altKey);
    }
    
    if (e.altKey && e.shiftKey && e.code === 'KeyR') {
      e.preventDefault();
      
      console.log('[kepoin:phantom] Triggering Snapshot...');
      const element = document.elementFromPoint(mouseX, mouseY);
      if (!element) {
        console.warn('[kepoin:phantom] No element found under cursor. Did you move the mouse?');
        return;
      }

      const domString = element.outerHTML.substring(0, 500) + (element.outerHTML.length > 500 ? '...' : '');
      const styles = extractComputedStyles(element);

      // Lightweight SVG ForeignObject -> Canvas -> Base64
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${element.offsetWidth}" height="${element.offsetHeight}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              ${element.outerHTML}
            </div>
          </foreignObject>
        </svg>
      `;

      const img = new Image();
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const urlBlob = URL.createObjectURL(svgBlob);

      img.onload = () => {
        let base64Image = '<Canvas Rendering Failed>';
        try {
          const canvas = document.createElement('canvas');
          canvas.width = element.offsetWidth;
          canvas.height = element.offsetHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          base64Image = canvas.toDataURL('image/jpeg', 0.5); // 50% quality to save bandwidth
        } catch (err) {
          console.error('[kepoin:phantom] Canvas rendering blocked (Likely Tainted Canvas / CORS):', err.message);
        }

        URL.revokeObjectURL(urlBlob);

        if (wsConnected && ws) {
          ws.send(JSON.stringify({
            type: 'kepoin:telemetry',
            payload: {
              status: 'Phantom Snapshot',
              target: element.tagName.toLowerCase(),
              domContext: domString,
              cssContext: styles,
              imageSlice: base64Image,
              timestamp: new Date().toISOString()
            }
          }));
          console.log('[kepoin:phantom] Snapshot beamed to Hub!');
        }
      };

      img.src = urlBlob;
    }
  });
}
