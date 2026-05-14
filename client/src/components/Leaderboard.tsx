import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import type { LeaderboardEntry, MatchHistory } from "../types";
import { Trophy, TrendingUp } from "lucide-react";
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

const API_BASE = `http://${window.location.hostname}:3005/api`;

export function Leaderboard() {
  const { token, user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<MatchHistory[]>([]);
  const [chartData, setChartData] = useState<
    { date: string; wpm: number; accuracy: number }[]
  >([]);
  const [tab, setTab] = useState<"global" | "history">("global");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    if (token && !user?.isGuest) {
      fetchHistory();
      fetchStats();
    }
  }, [token]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/leaderboard`);
      const data = await res.json();
      setLeaderboard(data);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/leaderboard/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/leaderboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setChartData(data.chartData || []);
    } catch {
      // ignore
    }
  };

  const chart = {
    labels: chartData.map((d) => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: "WPM",
        data: chartData.map((d) => d.wpm),
        borderColor: "#e2b714",
        backgroundColor: "rgba(226, 183, 20, 0.1)",
        tension: 0.3,
      },
      {
        label: "Accuracy %",
        data: chartData.map((d) => d.accuracy),
        borderColor: "#4ade80",
        backgroundColor: "rgba(74, 222, 128, 0.1)",
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#9ca3af" } },
    },
    scales: {
      x: { ticks: { color: "#6b7280" }, grid: { color: "#2d2d3a" } },
      y: { ticks: { color: "#6b7280" }, grid: { color: "#2d2d3a" } },
    },
  };

  return (
    <div className="leaderboard-page">
      <div className="page-header">
        <Trophy size={24} />
        <h2>Leaderboard</h2>
      </div>

      {/* Chart Area */}
      {token && !user?.isGuest && chartData.length > 0 && (
        <div className="chart-section">
          <h3>
            <TrendingUp size={16} /> Your Progress
          </h3>
          <div className="chart-container">
            <Line data={chart} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="lb-tabs">
        <button
          className={`lb-tab ${tab === "global" ? "active" : ""}`}
          onClick={() => setTab("global")}
        >
          Global Rankings
        </button>
        {token && !user?.isGuest && (
          <button
            className={`lb-tab ${tab === "history" ? "active" : ""}`}
            onClick={() => setTab("history")}
          >
            Match History
          </button>
        )}
      </div>

      {/* Global Leaderboard */}
      {tab === "global" && (
        <div className="lb-table">
          <div className="lb-table-header">
            <span>#</span>
            <span>Player</span>
            <span>Best WPM</span>
            <span>Avg WPM</span>
            <span>Accuracy</span>
            <span>Races</span>
            <span>Win %</span>
          </div>
          {loading && <p className="lb-loading">Loading...</p>}
          {leaderboard.map((entry, idx) => (
            <div
              key={entry.username}
              className={`lb-row ${entry.username === user?.username ? "is-self" : ""}`}
            >
              <span className="lb-rank">
                {idx === 0
                  ? "🥇"
                  : idx === 1
                    ? "🥈"
                    : idx === 2
                      ? "🥉"
                      : `#${idx + 1}`}
              </span>
              <span className="lb-name">{entry.username}</span>
              <span className="lb-best">{entry.bestWpm}</span>
              <span className="lb-avg">{entry.avgWpm}</span>
              <span className="lb-acc">{entry.bestAccuracy}%</span>
              <span className="lb-races">{entry.totalRaces}</span>
              <span className="lb-win">{entry.winRate}%</span>
            </div>
          ))}
          {!loading && leaderboard.length === 0 && (
            <p className="lb-empty">
              No data yet. Play some races to appear on the leaderboard!
            </p>
          )}
        </div>
      )}

      {/* Match History */}
      {tab === "history" && (
        <div className="lb-table">
          <div className="lb-table-header">
            <span>Date</span>
            <span>Mode</span>
            <span>WPM</span>
            <span>Accuracy</span>
            <span>Position</span>
            <span>Players</span>
          </div>
          {history.map((match) => (
            <div key={match.id} className="lb-row">
              <span>{new Date(match.date).toLocaleDateString()}</span>
              <span className="lb-mode">{match.mode}</span>
              <span>{match.wpm}</span>
              <span>{match.accuracy}%</span>
              <span>#{match.position}</span>
              <span>{match.totalPlayers}</span>
            </div>
          ))}
          {history.length === 0 && (
            <p className="lb-empty">No match history yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
