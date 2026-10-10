// @display-only: needs React and a browser WebSocket (WS_URL)
// Client hook: optimistic sends, ack reconciliation, resend after reconnect, gap sync.
// Render the chat with key={conversationId} so state resets when switching conversations.
import { useEffect, useRef, useState } from 'react';
import { reconnectDelay, upsertMessage } from './chat-state.js';

export function useChat(conversationId) {
  const [messages, setMessages] = useState([]);                   // sorted by seq; unsent ones last
  const ws = useRef(null), pending = useRef(new Map()), lastSeq = useRef(0);

  const upsert = m => setMessages(list => upsertMessage(list, m)); // our own echo, an ack, or a replay

  useEffect(() => {
    let attempt = 0, stopped = false, timer;
    const connect = () => {
      const sock = new WebSocket(WS_URL);
      ws.current = sock;
      sock.onopen = () => {
        attempt = 0;
        sock.send(JSON.stringify({ type: 'sync', conversationId, after: lastSeq.current }));   // fetch the gap
        for (const m of pending.current.values()) sock.send(JSON.stringify(m));                // resend unacked
      };
      sock.onmessage = e => {
        const evt = JSON.parse(e.data);
        if (evt.type === 'ack') {
          pending.current.delete(evt.clientId);
          upsert({ clientId: evt.clientId, seq: evt.seq, status: 'sent' });
        } else if (evt.type === 'message' && evt.conversationId === conversationId) {
          lastSeq.current = Math.max(lastSeq.current, evt.seq);
          upsert({ ...evt, status: 'sent' });
        }
      };
      sock.onclose = () => {
        if (!stopped) timer = setTimeout(connect, reconnectDelay(attempt++));   // full jitter
      };
    };
    connect();
    return () => { stopped = true; clearTimeout(timer); ws.current?.close(); };
  }, [conversationId]);

  const send = text => {
    const msg = { type: 'send', clientId: crypto.randomUUID(), conversationId, text };
    pending.current.set(msg.clientId, msg);
    upsert({ ...msg, from: 'me', status: 'sending' });            // optimistic bubble
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(msg));
  };
  return { messages, send };
}
