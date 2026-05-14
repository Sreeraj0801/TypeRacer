import { io, Socket } from "socket.io-client";

const SERVER_PORT = 3005;

// Determine server URL with the following precedence:
// 1. `VITE_SERVER_URL` environment variable (set in deployment)
// 2. For local development: same hostname with explicit `SERVER_PORT`
// 3. Otherwise: same origin as the page (avoids hardcoding ports in production)
const getServerUrl = () => {
  const env = (import.meta as any).env || {};
  const override = env.VITE_SERVER_URL;
  if (override) return override;

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:${SERVER_PORT}`;
  }

  // In production, assume the backend is reachable at the same origin
  return window.location.origin;
};

export const socket: Socket = io(getServerUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  // Prefer websocket transport; polling will be used as a fallback
  transports: ["websocket", "polling"],
});

export default socket;
