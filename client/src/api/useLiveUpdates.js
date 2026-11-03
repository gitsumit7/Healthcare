import { useEffect, useRef } from 'react';
import { TOKEN_KEY } from './client.js';

const EVENTS_URL = `${import.meta.env.VITE_API_URL || '/api'}/events`;
const MAX_RETRY_DELAY_MS = 10_000;

// Keeps a Server-Sent Events stream open and calls onEvent({ id, status }) whenever an appointment this user can
// see changes. Reconnects after the server restarts. fetch is used instead of EventSource so the token travels in
// the Authorization header rather than the URL.
export default function useLiveUpdates(onEvent) {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    let stopped = false;
    let controller;

    const run = async () => {
      for (let attempt = 0; !stopped; attempt++) {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;
        controller = new AbortController();
        try {
          const res = await fetch(EVENTS_URL, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
          if (res.status === 401 || res.status === 403) return;
          if (!res.ok || !res.body) throw new Error(`events stream: ${res.status}`);
          attempt = 0;
          // A reconnect may have missed changes, so let the page catch up.
          handler.current({ reconnected: true });

          const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
          let buffer = '';
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += value;
            let end;
            while ((end = buffer.indexOf('\n\n')) !== -1) {
              const data = buffer
                .slice(0, end)
                .split('\n')
                .filter((line) => line.startsWith('data:'))
                .map((line) => line.slice(5).trim())
                .join('\n');
              buffer = buffer.slice(end + 2);
              if (data) handler.current(JSON.parse(data));
            }
          }
        } catch {
          if (stopped) return;
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS)));
      }
    };

    run();
    return () => {
      stopped = true;
      controller?.abort();
    };
  }, []);
}
