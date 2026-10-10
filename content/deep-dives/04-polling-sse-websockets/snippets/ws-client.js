import { backoffDelay } from './backoff.js';

// WebSocket client with reconnect + full jitter, so 100K clients don't all reconnect in the same second after a deploy
export function connect(url, onMessage) {
  let ws, timer, attempt = 0, closed = false;
  const open = () => {
    ws = new WebSocket(url);
    ws.onopen = () => { attempt = 0; };
    ws.onmessage = e => onMessage(JSON.parse(e.data));
    ws.onclose = () => {
      if (closed) return;
      timer = setTimeout(open, backoffDelay(attempt++, { baseMs: 500 }));   // 0–0.5 s, 0–1 s, 0–2 s, … up to 30 s
    };
  };
  open();
  return {
    send: data => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(data)),   // false while reconnecting
    close: () => { closed = true; clearTimeout(timer); ws.close(); },                 // also cancels a pending reconnect
  };
}
