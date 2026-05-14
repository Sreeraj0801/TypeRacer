import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useGameContext } from "./GameProvider";
import type { PlayerData } from "../types";
import { useAuthStore } from "../stores/authStore";
import { Timer, LogOut, Globe } from "lucide-react";

const PLAYER_COLORS = [
  "#e74c3c",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
  "#e67e22",
  "#1abc9c",
  "#fd79a8",
  "#00cec9",
];

export function Race() {
  const { game, handleRaceFinish, handleLeave } = useGameContext();
  const { room, playerId, countdown, sendProgress } = game;
  const { user } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState(24);
  const textDisplayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // User cursor preferences
  const cursorStyle = user?.preferences?.cursorStyle || "line";
  const cursorColor = user?.preferences?.cursorColor || "#e2b714";

  const text = room?.text || "";
  const rules = room?.settings.rules;
  const allowBackspace = rules?.allowBackspace ?? true;
  const timeLimit = rules?.timeLimit ?? 0;
  const showLiveWpm = rules?.showLiveWpm ?? true;
  const showLiveAccuracy = rules?.showLiveAccuracy ?? true;

  // Split text into words for stable rendering (no jumping)
  // Each word includes its trailing space so lines don't reflow
  const words = useMemo(() => {
    if (!text) return [];
    const result: { word: string; startIndex: number }[] = [];
    let i = 0;
    while (i < text.length) {
      let wordEnd = i;
      // Find end of word
      while (wordEnd < text.length && text[wordEnd] !== " ") {
        wordEnd++;
      }
      // Include trailing space
      if (wordEnd < text.length && text[wordEnd] === " ") {
        wordEnd++;
      }
      result.push({ word: text.slice(i, wordEnd), startIndex: i });
      i = wordEnd;
    }
    return result;
  }, [text]);

  // Other players' cursors map
  const otherPlayerCursors = useMemo(() => {
    if (!room) return new Map<number, PlayerData[]>();
    const map = new Map<number, PlayerData[]>();
    for (const player of room.players) {
      if (player.id === playerId) continue;
      const idx = player.currentIndex ?? 0;
      if (idx >= 0 && idx < text.length) {
        const existing = map.get(idx) || [];
        existing.push(player);
        map.set(idx, existing);
      }
    }
    return map;
  }, [room, playerId, text.length]);

  // Stable color assignment
  const playerColorMap = useMemo(() => {
    if (!room) return new Map<string, number>();
    const map = new Map<string, number>();
    let colorIdx = 0;
    for (const player of room.players) {
      if (player.id !== playerId) {
        map.set(player.id, colorIdx % PLAYER_COLORS.length);
        colorIdx++;
      }
    }
    return map;
  }, [room, playerId]);

  // Time limit countdown
  useEffect(() => {
    if (room?.state !== "racing" || timeLimit === 0) return;
    const startTime = room.startTime || Date.now();
    const endTime = startTime + timeLimit * 1000;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [room?.state, room?.startTime, timeLimit]);

  useEffect(() => {
    if (room?.state === "finished") {
      handleRaceFinish();
    }
  }, [room?.state, handleRaceFinish]);

  useEffect(() => {
    if (inputRef.current && room?.state === "racing") {
      inputRef.current.focus();
    }
  }, [room?.state]);

  // Dynamic font sizing - shrink font to fit all text on screen without scroll
  useEffect(() => {
    const container = containerRef.current;
    const textEl = textDisplayRef.current;
    if (!container || !textEl || !text) return;

    let size = 28; // Start large
    const minSize = 14;
    textEl.style.fontSize = `${size}px`;

    // Shrink until text fits without overflow
    while (
      size > minSize &&
      textEl.scrollHeight > container.clientHeight - 10
    ) {
      size -= 1;
      textEl.style.fontSize = `${size}px`;
    }
    setFontSize(size);
  }, [text]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (finished || room?.state !== "racing") return;

      if (e.key === "Backspace") {
        e.preventDefault();
        if (!allowBackspace) return;
        if (currentIndex > 0) {
          const newIndex = currentIndex - 1;
          setCurrentIndex(newIndex);
          const newErrors = new Set(errors);
          newErrors.delete(newIndex);
          setErrors(newErrors);
        }
        return;
      }

      if (e.key.length !== 1) return;
      e.preventDefault();

      const expectedChar = text[currentIndex];
      const typedChar = e.key;
      const newTotalChars = totalChars + 1;
      setTotalChars(newTotalChars);

      let newCorrectChars = correctChars;
      const newErrors = new Set(errors);

      if (typedChar === expectedChar) {
        newCorrectChars = correctChars + 1;
        setCorrectChars(newCorrectChars);
      } else {
        newErrors.add(currentIndex);
        setErrors(newErrors);
      }

      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      sendProgress(newIndex, newCorrectChars, newTotalChars);

      if (newIndex >= text.length) {
        setFinished(true);
      }
    },
    [
      currentIndex,
      correctChars,
      totalChars,
      errors,
      text,
      finished,
      room?.state,
      sendProgress,
      allowBackspace,
    ],
  );

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  if (!room) return null;

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

  const currentPlayer = room.players.find((p) => p.id === playerId);
  const sortedPlayers = [...room.players].sort(
    (a, b) => b.progress - a.progress,
  );
  const isMultiplayer = room.players.length > 1;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="race-fullscreen" onClick={handleContainerClick}>
      {/* Minimal top bar */}
      <div className="race-topbar-minimal">
        <div className="race-stats-row">
          {showLiveWpm && (
            <div className="race-stat-item">
              <span className="race-stat-value">{currentPlayer?.wpm || 0}</span>
              <span className="race-stat-label">WPM</span>
            </div>
          )}
          {showLiveAccuracy && (
            <div className="race-stat-item">
              <span className="race-stat-value">
                {currentPlayer?.accuracy || 100}%
              </span>
              <span className="race-stat-label">ACC</span>
            </div>
          )}
          <div className="race-stat-item">
            <span className="race-stat-value">
              {Math.round(currentPlayer?.progress || 0)}%
            </span>
            <span className="race-stat-label">DONE</span>
          </div>
          {timeLimit > 0 && timeLeft !== null && (
            <div
              className={`race-stat-item ${timeLeft <= 10 ? "stat-danger" : ""}`}
            >
              <span className="race-stat-value">
                <Timer size={12} /> {formatTime(timeLeft)}
              </span>
              <span className="race-stat-label">TIME</span>
            </div>
          )}
        </div>
        <div className="race-topbar-right">
          {isMultiplayer && <span className="race-room-badge">#{room.id}</span>}
          <button
            className="race-exit-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleLeave();
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Race Track (horizontal progress) - always visible */}
      <div className="race-track">
        <div className="race-track-bar">
          {sortedPlayers.map((player) => {
            const isSelf = player.id === playerId;
            const colorIdx = playerColorMap.get(player.id) ?? 0;
            const color = isSelf ? cursorColor : PLAYER_COLORS[colorIdx];
            return (
              <div
                key={player.id}
                className={`race-track-marker ${isSelf ? "is-self" : ""}`}
                style={{
                  left: `${player.progress}%`,
                  backgroundColor: color,
                }}
                title={`${player.name}: ${Math.round(player.progress)}%`}
              />
            );
          })}
        </div>
        {isMultiplayer && (
          <div className="race-track-labels">
            {sortedPlayers.map((player) => {
              const isSelf = player.id === playerId;
              const colorIdx = playerColorMap.get(player.id) ?? 0;
              const color = isSelf ? cursorColor : PLAYER_COLORS[colorIdx];
              return (
                <span
                  key={player.id}
                  className="race-track-label"
                  style={{ left: `${player.progress}%`, color }}
                >
                  {player.name.slice(0, 3)}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="race-breadcrumb">
        <Globe size={12} />
        <span>
          {room.settings.mode === "custom"
            ? "custom"
            : room.settings.difficulty || "medium"}
        </span>
        <span className="breadcrumb-sep">›</span>
        <span>{room.settings.mode}</span>
        <span className="breadcrumb-sep">›</span>
        <span>{text.split(" ").length} words</span>
      </div>

      {/* Main Typing Area - takes full center, NO scroll */}
      <div className="race-typing-zone" ref={containerRef}>
        <div
          className="race-text-container"
          ref={textDisplayRef}
          style={{ fontSize: `${fontSize}px` }}
        >
          {words.map(({ word, startIndex }) => (
            <span key={startIndex} className="race-word">
              {word.split("").map((char, charOffset) => {
                const index = startIndex + charOffset;
                let className = "race-char";
                if (index < currentIndex) {
                  className += errors.has(index)
                    ? " race-char-error"
                    : " race-char-correct";
                } else if (index === currentIndex) {
                  className += ` race-char-current cursor-${cursorStyle}`;
                } else {
                  className += " race-char-pending";
                }

                const cursorsHere = otherPlayerCursors.get(index);

                return (
                  <span
                    key={index}
                    className={className}
                    style={
                      index === currentIndex
                        ? ({
                            "--cursor-color": cursorColor,
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {char === " " ? "\u00A0" : char}
                    {cursorsHere?.map((p) => {
                      const colorIdx = playerColorMap.get(p.id) ?? 0;
                      return (
                        <span
                          key={p.id}
                          className="race-other-cursor"
                          style={{ borderColor: PLAYER_COLORS[colorIdx] }}
                          title={p.name}
                        />
                      );
                    })}
                  </span>
                );
              })}
            </span>
          ))}
        </div>
        <input
          ref={inputRef}
          type="text"
          className="hidden-input"
          onKeyDown={handleKeyDown}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {finished && (
          <div className="race-finished-msg">
            <p>
              {isMultiplayer
                ? "Finished! Waiting for others..."
                : "Processing results..."}
            </p>
          </div>
        )}
      </div>

      {/* Live Standings - bottom bar for multiplayer */}
      {isMultiplayer && (
        <div className="race-standings-bar">
          {sortedPlayers.map((player, idx) => {
            const isSelf = player.id === playerId;
            const colorIdx = playerColorMap.get(player.id) ?? 0;
            const color = isSelf ? "var(--accent)" : PLAYER_COLORS[colorIdx];
            return (
              <div
                key={player.id}
                className={`race-standing-item ${isSelf ? "is-self" : ""}`}
              >
                <span className="race-standing-pos">#{idx + 1}</span>
                <span className="race-standing-name" style={{ color }}>
                  {player.name}
                </span>
                <span className="race-standing-wpm">{player.wpm} wpm</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
