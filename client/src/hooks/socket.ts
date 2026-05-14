import { io, Socket } from "socket.io-client";

const SERVER_PORT = 3005;

// Dynamically determine server URL based on current page hostname
// This allows network sharing - players will connect to the same IP as the UI
const getServerUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:${SERVER_PORT}`;
};

export const socket: Socket = io(getServerUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ["polling", "websocket"],
});

export default socket;
