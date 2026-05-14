import { useState, useEffect, useCallback, useRef } from "react";
import socket from "./socket";
import type {
  RoomData,
  RoomSettings,
  ChatMessage,
  GameMode,
  PublicRoom,
} from "../types";
import { useAuthStore } from "../stores/authStore";

export function useGame(onRaceFinished?: () => void) {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(socket.connected);
  const [error, setError] = useState<string | null>(null);
  const [isSinglePlayer, setIsSinglePlayer] = useState(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [kicked, setKicked] = useState(false);
  const roomRef = useRef<RoomData | null>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Authenticate socket when token is available
  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (token && socket.connected) {
      socket.emit("authenticate", { token }, () => {});
    }
  }, [connected]);

  useEffect(() => {
    if (socket.connected) {
      setPlayerId(socket.id || "");
      setConnected(true);
    }

    socket.on("connect", () => {
      setPlayerId(socket.id || "");
      setConnected(true);
      // Re-authenticate on reconnect
      const token = useAuthStore.getState().token;
      if (token) {
        socket.emit("authenticate", { token }, () => {});
      }
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("room-updated", (data: RoomData) => {
      setRoom(data);
    });

    socket.on("race-countdown", (data: RoomData) => {
      setRoom(data);
      setCountdown(3);
    });

    socket.on("countdown-tick", (count: number) => {
      setCountdown(count);
    });

    socket.on("race-start", (data: RoomData) => {
      setRoom(data);
      setCountdown(null);
    });

    socket.on("player-progress", (data: RoomData) => {
      setRoom(data);
    });

    socket.on("race-finished", (data: RoomData) => {
      setRoom(data);
      if (onRaceFinished) onRaceFinished();
    });

    socket.on("chat-message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("rooms-list", (data: PublicRoom[]) => {
      setPublicRooms(data || []);
    });

    socket.on("kicked-from-room", () => {
      setRoom(null);
      setMessages([]);
      setKicked(true);
      setTimeout(() => setKicked(false), 5000);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room-updated");
      socket.off("race-countdown");
      socket.off("countdown-tick");
      socket.off("race-start");
      socket.off("player-progress");
      socket.off("race-finished");
      socket.off("chat-message");
      socket.off("rooms-list");
      socket.off("kicked-from-room");
    };
  }, []);

  const createRoom = useCallback(
    (
      playerName: string,
      settings: Partial<RoomSettings>,
      gameMode: GameMode = "local",
    ) => {
      return new Promise<RoomData>((resolve, reject) => {
        setIsSinglePlayer(gameMode === "practice");
        socket.emit(
          "create-room",
          { playerName, settings, gameMode },
          (response: { success: boolean; room?: RoomData; error?: string }) => {
            if (response.success && response.room) {
              setRoom(response.room);
              setMessages([]);
              resolve(response.room);
            } else {
              setError(response.error || "Failed to create room");
              reject(new Error(response.error));
            }
          },
        );
      });
    },
    [],
  );

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    return new Promise<RoomData>((resolve, reject) => {
      setIsSinglePlayer(false);
      socket.emit(
        "join-room",
        { roomId, playerName },
        (response: { success: boolean; room?: RoomData; error?: string }) => {
          if (response.success && response.room) {
            setRoom(response.room);
            setMessages([]);
            resolve(response.room);
          } else {
            setError(response.error || "Failed to join room");
            reject(new Error(response.error));
          }
        },
      );
    });
  }, []);

  const startRace = useCallback(() => {
    if (room) {
      socket.emit("start-race", { roomId: room.id });
    }
  }, [room]);

  const updateSettings = useCallback(
    (settings: Partial<RoomSettings>) => {
      if (room) {
        socket.emit("update-settings", { roomId: room.id, settings });
      }
    },
    [room],
  );

  const sendProgress = useCallback(
    (currentIndex: number, correctChars: number, totalChars: number) => {
      if (roomRef.current) {
        socket.emit("typing-progress", {
          roomId: roomRef.current.id,
          currentIndex,
          correctChars,
          totalChars,
        });
      }
    },
    [],
  );

  const leaveRoom = useCallback(() => {
    if (room) {
      socket.emit("leave-room", { roomId: room.id });
      setRoom(null);
      setMessages([]);
    }
  }, [room]);

  const sendMessage = useCallback(
    (message: string) => {
      if (room) {
        socket.emit("chat-message", { roomId: room.id, message });
      }
    },
    [room],
  );

  const kickPlayer = useCallback(
    (targetPlayerId: string) => {
      if (room) {
        socket.emit("kick-player", {
          roomId: room.id,
          playerId: targetPlayerId,
        });
      }
    },
    [room],
  );

  const restartRace = useCallback(() => {
    if (room) {
      socket.emit("restart-race", { roomId: room.id });
    }
  }, [room]);

  const startSinglePlayer = useCallback(
    (playerName: string, settings: Partial<RoomSettings>) => {
      return new Promise<RoomData>((resolve, reject) => {
        setIsSinglePlayer(true);
        socket.emit(
          "create-room",
          { playerName, settings, gameMode: "practice" },
          (response: { success: boolean; room?: RoomData; error?: string }) => {
            if (response.success && response.room) {
              setRoom(response.room);
              setMessages([]);
              socket.emit("start-race", { roomId: response.room.id });
              resolve(response.room);
            } else {
              setError(response.error || "Failed to start practice");
              reject(new Error(response.error));
            }
          },
        );
      });
    },
    [],
  );

  const fetchPublicRooms = useCallback(async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3005/rooms`);
      const data = await res.json();
      setPublicRooms(data.rooms || []);
    } catch {
      // ignore
    }
  }, []);

  return {
    room,
    playerId,
    countdown,
    messages,
    connected,
    error,
    isSinglePlayer,
    publicRooms,
    kicked,
    setError,
    createRoom,
    joinRoom,
    startRace,
    startSinglePlayer,
    updateSettings,
    sendProgress,
    leaveRoom,
    sendMessage,
    kickPlayer,
    restartRace,
    fetchPublicRooms,
  };
}
