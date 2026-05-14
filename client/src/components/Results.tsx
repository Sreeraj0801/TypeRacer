import { useGameContext } from "./GameProvider";
import {
  Trophy,
  Clock,
  Target,
  RotateCcw,
  LogOut,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

const PLAYER_COLORS = [
  "#e2b714",
  "#e74c3c",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
  "#e67e22",
  "#1abc9c",
  "#fd79a8",
];

export function Results() {
  const { game, handleRematch, handleLeave } = useGameContext();
  const { room, playerId, isSinglePlayer } = game;

  if (!room) return null;

  const sortedPlayers = [...room.players].sort((a, b) => {
    const scoreA = (a.wpm || 0) * ((a.accuracy || 0) / 100);
    const scoreB = (b.wpm || 0) * ((b.accuracy || 0) / 100);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return (a.finishTime || 0) - (b.finishTime || 0);
  });

  const currentPlayer = room.players.find((p) => p.id === playerId);
  const isMultiplayer = room.players.length > 1;

  const getMedalEmoji = (position: number) => {
    switch (position) {
      case 0:
        return "🥇";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return `#${position + 1}`;
    }
  };

  const formatTime = (ms: number | null) => {
    if (!ms) return "-";
    const seconds = ms / 1000;
    return `${seconds.toFixed(1)}s`;
  };

  // Generate performance comparison chart for multiplayer
  const performanceChart = isMultiplayer
    ? {
        labels: sortedPlayers.map((p) => p.name),
        datasets: [
          {
            label: "WPM",
            data: sortedPlayers.map((p) => p.wpm),
            borderColor: "#e2b714",
            backgroundColor: "rgba(226, 183, 20, 0.2)",
            tension: 0.3,
            fill: true,
          },
          {
            label: "Accuracy %",
            data: sortedPlayers.map((p) => p.accuracy),
            borderColor: "#4ade80",
            backgroundColor: "rgba(74, 222, 128, 0.1)",
            tension: 0.3,
            fill: true,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#9ca3af", font: { size: 11 } } },
    },
    scales: {
      x: { ticks: { color: "#6b7280" }, grid: { color: "#1f2125" } },
      y: { ticks: { color: "#6b7280" }, grid: { color: "#1f2125" } },
    },
  };

  return (
    <div className="results-fullscreen">
      <div className="results-inner">
        <div className="results-header">
          <Trophy size={28} className="trophy-icon" />
          <h2>Race Complete</h2>
        </div>

        {/* Podium for top 3 */}
        {sortedPlayers.length > 1 && (
          <div className="results-podium">
            {sortedPlayers.slice(0, 3).map((player, index) => (
              <div
                key={player.id}
                className={`podium-spot podium-${index + 1} ${player.id === playerId ? "is-self" : ""}`}
              >
                <div className="podium-medal">{getMedalEmoji(index)}</div>
                <div className="podium-name">{player.name}</div>
                <div className="podium-stats">
                  <span className="podium-wpm">{player.wpm} WPM</span>
                  <span className="podium-acc">{player.accuracy}%</span>
                </div>
                <div className="podium-time">
                  {formatTime(player.finishTime)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Performance Chart for multiplayer */}
        {isMultiplayer && performanceChart && (
          <div className="results-chart-section">
            <h3>
              <TrendingUp size={14} /> Performance Comparison
            </h3>
            <div className="results-chart-container">
              <Line data={performanceChart} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Full Results Table */}
        <div className="results-table">
          <div className="results-table-header">
            <span>Rank</span>
            <span>Player</span>
            <span>
              <Clock size={12} /> Time
            </span>
            <span>WPM</span>
            <span>
              <Target size={12} /> Accuracy
            </span>
          </div>
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`results-row ${player.id === playerId ? "is-self" : ""}`}
            >
              <span className="rank">{getMedalEmoji(index)}</span>
              <span className="name">{player.name}</span>
              <span className="time">{formatTime(player.finishTime)}</span>
              <span className="wpm">{player.wpm}</span>
              <span className="accuracy">{player.accuracy}%</span>
            </div>
          ))}
        </div>

        {/* Your Performance */}
        {currentPlayer && (
          <div className="your-stats">
            <h3>Your Performance</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-card-value">{currentPlayer.wpm}</span>
                <span className="stat-card-label">WPM</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-value">
                  {currentPlayer.accuracy}%
                </span>
                <span className="stat-card-label">Accuracy</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-value">
                  {formatTime(currentPlayer.finishTime)}
                </span>
                <span className="stat-card-label">Time</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-value">
                  {currentPlayer.position || "-"}
                </span>
                <span className="stat-card-label">Position</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions - ALL players can rematch */}
        <div className="results-actions">
          <button className="btn btn-primary btn-large" onClick={handleRematch}>
            <RotateCcw size={18} />
            {isSinglePlayer ? "Practice Again" : "Rematch"}
          </button>
          <button className="btn btn-ghost" onClick={handleLeave}>
            <ArrowLeft size={16} />
            Exit to Home
          </button>
        </div>
      </div>
    </div>
  );
}
