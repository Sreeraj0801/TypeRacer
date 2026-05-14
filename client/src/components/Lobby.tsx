import { useState } from "react";
import { useGameContext } from "./GameProvider";
import type { RoomSettings } from "../types";
import {
  Copy,
  Crown,
  Play,
  LogOut,
  Settings,
  MessageCircle,
  Send,
  X,
  UserMinus,
} from "lucide-react";
import toast from "react-hot-toast";

export function Lobby() {
  const { game, handleRaceStart, handleLeave } = useGameContext();
  const {
    room,
    playerId,
    countdown,
    messages,
    sendMessage,
    kickPlayer,
    updateSettings,
  } = game;
  const [showSettings, setShowSettings] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const isHost = playerId === room.hostId;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    toast.success("Room code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendMessage(chatInput.trim());
      setChatInput("");
    }
  };

  const handleStart = () => {
    handleRaceStart();
  };

  const handleKick = (targetId: string, name: string) => {
    kickPlayer(targetId);
    toast.success(`${name} kicked`);
  };

  const handleUpdateSettings = (newSettings: Partial<RoomSettings>) => {
    updateSettings(newSettings);
  };

  if (countdown !== null) {
    return (
      <div className="countdown-overlay">
        <div className="countdown-number">
          {countdown === 0 ? "GO!" : countdown}
        </div>
        <p className="countdown-text">Get ready to type...</p>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <div className="room-info">
          <span className="room-label">ROOM</span>
          <div className="room-code-display" onClick={handleCopyCode}>
            <span className="room-code">{room.id}</span>
            <Copy size={14} />
            {copied && <span className="copied-badge">Copied!</span>}
          </div>
          <span className="room-mode-badge">{room.gameMode || "local"}</span>
        </div>
        <div className="lobby-actions">
          {isHost && (
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings size={16} />
                Config
              </button>
              <button
                className="btn btn-primary"
                onClick={handleStart}
                disabled={room.players.length < 1}
              >
                <Play size={16} />
                Start Race
              </button>
            </>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleLeave}>
            <LogOut size={16} />
            Leave
          </button>
        </div>
      </div>

      {/* Host Configuration */}
      {showSettings && isHost && (
        <div className="settings-panel">
          <div className="settings-panel-header">
            <h3>Race Configuration</h3>
            <button
              className="btn-icon-sm"
              onClick={() => setShowSettings(false)}
            >
              <X size={14} />
            </button>
          </div>
          <div className="settings-grid">
            <div className="input-group">
              <label>Mode</label>
              <select
                className="input"
                value={room.settings.mode}
                onChange={(e) =>
                  handleUpdateSettings({ mode: e.target.value as any })
                }
              >
                <option value="words">Words</option>
                <option value="code">Code</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {room.settings.mode === "words" && (
              <>
                <div className="input-group">
                  <label>Difficulty</label>
                  <select
                    className="input"
                    value={room.settings.difficulty}
                    onChange={(e) =>
                      handleUpdateSettings({
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
                  <label>Words</label>
                  <select
                    className="input"
                    value={room.settings.wordCount}
                    onChange={(e) =>
                      handleUpdateSettings({
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
                  <label>Text Type</label>
                  <select
                    className="input"
                    value={room.settings.textType}
                    onChange={(e) =>
                      handleUpdateSettings({ textType: e.target.value as any })
                    }
                  >
                    <option value="words">Words</option>
                    <option value="sentences">Sentences</option>
                    <option value="quotes">Quotes</option>
                  </select>
                </div>
              </>
            )}
            {room.settings.mode === "code" && (
              <div className="input-group">
                <label>Language</label>
                <select
                  className="input"
                  value={room.settings.language}
                  onChange={(e) =>
                    handleUpdateSettings({ language: e.target.value as any })
                  }
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                </select>
              </div>
            )}
            <div className="input-group">
              <label>Time Limit</label>
              <select
                className="input"
                value={room.settings.rules?.timeLimit || 0}
                onChange={(e) =>
                  handleUpdateSettings({
                    rules: {
                      ...room.settings.rules,
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
            <div className="input-group">
              <label>Max Players</label>
              <select
                className="input"
                value={room.settings.rules?.maxPlayers || 8}
                onChange={(e) =>
                  handleUpdateSettings({
                    rules: {
                      ...room.settings.rules,
                      maxPlayers: Number(e.target.value),
                    },
                  })
                }
              >
                <option value={2}>2</option>
                <option value={4}>4</option>
                <option value={6}>6</option>
                <option value={8}>8</option>
              </select>
            </div>
            <div className="input-group">
              <label>Backspace</label>
              <select
                className="input"
                value={room.settings.rules?.allowBackspace ? "yes" : "no"}
                onChange={(e) =>
                  handleUpdateSettings({
                    rules: {
                      ...room.settings.rules,
                      allowBackspace: e.target.value === "yes",
                    },
                  })
                }
              >
                <option value="yes">Allowed</option>
                <option value="no">Disabled</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="lobby-content">
        {/* Players */}
        <div className="players-section">
          <h3>
            Players ({room.players.length}/
            {room.settings.rules?.maxPlayers || 8})
          </h3>
          <div className="players-list">
            {room.players.map((player) => (
              <div
                key={player.id}
                className={`player-card ${player.id === playerId ? "is-self" : ""}`}
              >
                <div className="player-avatar">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="player-name">
                  {player.name}
                  {player.id === room.hostId && (
                    <Crown size={12} className="host-icon" />
                  )}
                  {player.id === playerId && (
                    <span className="you-badge">YOU</span>
                  )}
                </span>
                {isHost && player.id !== playerId && (
                  <button
                    className="kick-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleKick(player.id, player.name);
                    }}
                    title="Kick player"
                  >
                    <UserMinus size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!isHost && (
            <p className="waiting-text">Waiting for host to start...</p>
          )}
        </div>

        {/* Chat */}
        <div className="chat-section">
          <div className="chat-header">
            <MessageCircle size={14} />
            <h3>Chat</h3>
          </div>
          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="chat-empty">No messages yet</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className="chat-message">
                <span className="chat-name">{msg.playerName}:</span>
                <span className="chat-text">{msg.message}</span>
              </div>
            ))}
          </div>
          <form className="chat-input-form" onSubmit={handleSendChat}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="input chat-input"
              maxLength={200}
            />
            <button
              type="submit"
              className="btn btn-primary btn-icon"
              disabled={!chatInput.trim()}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      <div className="lobby-mode-badge">
        {room.settings.mode === "code" && `Code: ${room.settings.language}`}
        {room.settings.mode === "words" &&
          `${room.settings.difficulty} · ${room.settings.wordCount} words`}
        {room.settings.mode === "custom" && "Custom Text"}
      </div>
    </div>
  );
}
