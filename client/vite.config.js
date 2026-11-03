import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Fail instead of silently moving to 5174: Google sign-in only allows the registered origin.
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        // While the API is starting or restarting, answer with a retryable 503 instead of a 500 and a stack trace.
        configure: (proxy) => {
          // Vite adds its own stack-trace logger right after this hook, so replace it on the next tick.
          process.nextTick(() => {
            proxy.removeAllListeners('error');
            proxy.on('error', (err, req, res) => {
              console.warn(`[api] ${req?.url}: ${err.code || err.message} (API not ready yet)`);
              if (!res || res.headersSent || typeof res.writeHead !== 'function') return res?.end?.();
              res.writeHead(503, { 'Content-Type': 'application/json', 'Retry-After': '1' });
              res.end(JSON.stringify({ message: 'The server is starting up. Please try again in a moment.', starting: true }));
            });
          });
        },
      },
    },
  },
});
