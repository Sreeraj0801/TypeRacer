import { useState, useEffect } from "react";
import { useGameContext } from "./GameProvider";
import { useAuthStore } from "../stores/authStore";
import type { RoomSettings, PublicRoom } from "../types";
import { User, Globe, Lock, Users, Zap, Trophy } from "lucide-react";
import { APP_NAME, APP_VERSION } from "../constants/app";
import toast from "react-hot-toast";

const DEFAULT_SETTINGS: Partial<RoomSettings> = {
  mode: "words",
  wordCount: 30,
  difficulty: "medium",
  language: "javascript",
  textType: "words",
  rules: {
    timeLimit: 0,
    allowBackspace: true,
    minAccuracy: 0,
    showLiveWpm: true,
    showLiveAccuracy: true,
    autoStart: false,
    maxPlayers: 8,
  },
};

export function Dashboard() {
  const {
    startPractice,
    createOnlineRoom,
    createLocalRoom,
    joinRoomById,
    game,
  } = useGameContext();
  const { user } = useAuthStore();
  const [settings, setSettings] =
    useState<Partial<RoomSettings>>(DEFAULT_SETTINGS);
  const [roomCode, setRoomCode] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    game.fetchPublicRooms();
  }, []);

  const handlePractice = async () => {
    setLoading(true);
    try {
      await startPractice(settings);
    } catch (err: any) {
      toast.error(err.message || "Failed to start practice");
    }
    setLoading(false);
  };

  const handleOnline = async () => {
    setLoading(true);
    try {
      await createOnlineRoom(settings);
    } catch (err: any) {
      toast.error(err.message || "Failed to create room");
    }
    setLoading(false);
  };

  const handleLocal = async () => {
    setLoading(true);
    try {
      await createLocalRoom(settings);
    } catch (err: any) {
      toast.error(err.message || "Failed to create room");
    }
    setLoading(false);
  };

  const handleJoin = async (id?: string) => {
    const code = id || roomCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    try {
      await joinRoomById(code);
    } catch (err: any) {
      toast.error(err.message || "Failed to join room");
    }
    setLoading(false);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-welcome">
        <h2>
          Welcome back, <span className="accent">{user?.username}</span>
        </h2>
        <div className="quick-stats">
          {user && !user.isGuest && (
            <>
              <div className="quick-stat">
                <Zap size={14} />
                <span>{user.stats.bestWpm} WPM Best</span>
              </div>
              <div className="quick-stat">
                <Trophy size={14} />
                <span>{user.stats.totalWins} Wins</span>
              </div>
              <div className="quick-stat">
                <Users size={14} />
                <span>{user.stats.totalRaces} Races</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Game Mode Cards */}
      <div className="mode-cards">
        <div className="mode-card" onClick={handlePractice}>
          <div className="mode-icon">
            <User size={28} />
          </div>
          <h3>Practice</h3>
          <p>Solo typing practice. Improve your speed and accuracy.</p>
          <button className="btn btn-primary" disabled={loading}>
            Start
          </button>
        </div>

        <div className="mode-card" onClick={handleOnline}>
          <div className="mode-icon">
            <Globe size={28} />
          </div>
          <h3>Play Online</h3>
          <p>Create a public room. Anyone on the server can join.</p>
          <button className="btn btn-primary" disabled={loading}>
            Host
          </button>
        </div>

        <div className="mode-card" onClick={handleLocal}>
          <div className="mode-icon">
            <Lock size={28} />
          </div>
          <h3>Play Local</h3>
          <p>Private room with code. Share with friends to race.</p>
          <button className="btn btn-primary" disabled={loading}>
            Create
          </button>
        </div>
      </div>

      {/* Join Room */}
      <div className="join-section-dash">
        <div className="join-input-row">
          <input
            type="text"
            className="input input-code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ROOM CODE"
            maxLength={6}
          />
          <button
            className="btn btn-secondary"
            onClick={() => handleJoin()}
            disabled={!roomCode.trim() || loading}
          >
            Join Room
          </button>
        </div>
      </div>

      {/* Settings Toggle */}
      <div className="settings-toggle-section">
        <button
          className="btn btn-ghost"
          onClick={() => setShowSettings(!showSettings)}
        >
          {showSettings ? "Hide Settings" : "Race Settings"}
        </button>
      </div>

      {showSettings && (
        <div className="race-settings-panel">
          <div className="settings-grid">
            <div className="input-group">
              <label>Mode</label>
              <select
                className="input"
                value={settings.mode}
                onChange={(e) =>
                  setSettings({ ...settings, mode: e.target.value as any })
                }
              >
                <option value="words">Words</option>
                <option value="code">Code</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="input-group">
              <label>Difficulty</label>
              <select
                className="input"
                value={settings.difficulty}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    difficulty: e.target.value as any,
                  })
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="input-group">
              <label>Word Count</label>
              <select
                className="input"
                value={settings.wordCount}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    wordCount: Number(e.target.value),
                  })
                }
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="input-group">
              <label>Time Limit</label>
              <select
                className="input"
                value={settings.rules?.timeLimit || 0}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rules: {
                      ...settings.rules!,
                      timeLimit: Number(e.target.value),
                    },
                  })
                }
              >
                <option value={0}>None</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
                <option value={120}>2m</option>
              </select>
            </div>
            {settings.mode === "code" && (
              <div className="input-group">
                <label>Language</label>
                <select
                  className="input"
                  value={settings.language}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      language: e.target.value as any,
                    })
                  }
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="rust">Rust</option>
                  <option value="go">Go</option>
                </select>
              </div>
            )}
          </div>
          {settings.mode === "custom" && (
            <div className="input-group" style={{ marginTop: 12 }}>
              <label>Custom Text</label>
              <textarea
                className="input"
                rows={4}
                placeholder="Enter your custom text to type..."
                value={settings.customText || ""}
                onChange={(e) =>
                  setSettings({ ...settings, customText: e.target.value })
                }
                style={{
                  resize: "vertical",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Public Rooms */}
      {game.publicRooms.length > 0 && (
        <div className="public-rooms">
          <h3>
            <Globe size={16} /> Public Rooms
          </h3>
          <div className="rooms-list">
            {game.publicRooms.map((r: PublicRoom) => (
              <div key={r.id} className="room-item">
                <div className="room-item-info">
                  <span className="room-item-code">{r.id}</span>
                  <span className="room-item-players">
                    {r.players}/{r.maxPlayers}
                  </span>
                  <span className={`room-item-state ${r.state}`}>
                    {r.state}
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={
                    r.players >= r.maxPlayers ||
                    r.state !== "waiting" ||
                    loading
                  }
                  onClick={() => handleJoin(r.id)}
                >
                  {r.players >= r.maxPlayers ? "Full" : "Join"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="dashboard-footer">
        <span>Server: {game.connected ? "Online" : "Offline"}</span>
        <span>
          {APP_NAME} v{APP_VERSION}
        </span>
      </footer>
    </div>
  );
}
