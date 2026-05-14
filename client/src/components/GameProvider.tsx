import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useGame } from "../hooks/useGame";
import type { RoomSettings, GameMode } from "../types";
import { useAuthStore } from "../stores/authStore";

type GameView = "home" | "lobby" | "race" | "results";

interface GameContextType {
  game: ReturnType<typeof useGame>;
  view: GameView;
  setView: (v: GameView) => void;
  startPractice: (settings: Partial<RoomSettings>) => Promise<void>;
  createOnlineRoom: (settings: Partial<RoomSettings>) => Promise<void>;
  createLocalRoom: (settings: Partial<RoomSettings>) => Promise<void>;
  joinRoomById: (roomId: string) => Promise<void>;
  handleRaceStart: () => void;
  handleRaceFinish: () => void;
  handleRematch: () => void;
  handleLeave: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGameContext() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGameContext must be used within GameProvider");
  return ctx;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<GameView>("home");
  const handleRaceFinishedAll = useCallback(() => setView("results"), []);
  const game = useGame(handleRaceFinishedAll);
  const { user } = useAuthStore();

  const getPlayerName = () => user?.username || "Player";

  const startPractice = useCallback(
    async (settings: Partial<RoomSettings>) => {
      await game.startSinglePlayer(getPlayerName(), settings);
      setView("race");
    },
    [game, user],
  );

  const createOnlineRoom = useCallback(
    async (settings: Partial<RoomSettings>) => {
      await game.createRoom(getPlayerName(), settings, "online");
      setView("lobby");
    },
    [game, user],
  );

  const createLocalRoom = useCallback(
    async (settings: Partial<RoomSettings>) => {
      await game.createRoom(getPlayerName(), settings, "local");
      setView("lobby");
    },
    [game, user],
  );

  const joinRoomById = useCallback(
    async (roomId: string) => {
      await game.joinRoom(roomId, getPlayerName());
      setView("lobby");
    },
    [game, user],
  );

  const handleRaceStart = useCallback(() => {
    game.startRace();
    setView("race");
  }, [game]);

  const handleRaceFinish = useCallback(() => {
    setView("results");
  }, []);

  const handleRematch = useCallback(() => {
    game.restartRace();
    setView("lobby");
  }, [game]);

  const handleLeave = useCallback(() => {
    game.leaveRoom();
    setView("home");
  }, [game]);

  // Auto-transition for non-host players when race starts
  const roomState = game.room?.state;
  if (
    view === "lobby" &&
    (roomState === "racing" || roomState === "countdown")
  ) {
    setView("race");
  }

  return (
    <GameContext.Provider
      value={{
        game,
        view,
        setView,
        startPractice,
        createOnlineRoom,
        createLocalRoom,
        joinRoomById,
        handleRaceStart,
        handleRaceFinish,
        handleRematch,
        handleLeave,
      }}
    >
      {children}
      {!game.connected && (
        <div className="connection-overlay">
          <div className="connection-modal">
            <div className="spinner" />
            <p>Connecting to server...</p>
          </div>
        </div>
      )}
    </GameContext.Provider>
  );
}
