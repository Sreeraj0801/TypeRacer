import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import type { MatchHistory } from "../types";
import { User, Trophy, Zap, Target } from "lucide-react";

const API_BASE = `http://${window.location.hostname}:3005/api`;

export function Profile() {
  const { user, token } = useAuthStore();
  const [recentMatches, setRecentMatches] = useState<MatchHistory[]>([]);

  useEffect(() => {
    if (token && !user?.isGuest) {
      fetchHistory();
    }
  }, [token]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/leaderboard/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRecentMatches(data.slice(0, 10));
    } catch {
      // ignore
    }
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="page-header">
        <User size={24} />
        <h2>Profile</h2>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h3>{user.username}</h3>
          <span
            className={`profile-badge ${user.isGuest ? "guest" : "member"}`}
          >
            {user.isGuest ? "Guest" : "Member"}
          </span>
        </div>
      </div>

      {!user.isGuest && (
        <div className="profile-stats">
          <div className="stat-card">
            <Zap size={16} />
            <span className="stat-card-value">{user.stats.bestWpm}</span>
            <span className="stat-card-label">Best WPM</span>
          </div>
          <div className="stat-card">
            <Target size={16} />
            <span className="stat-card-value">{user.stats.avgWpm}</span>
            <span className="stat-card-label">Avg WPM</span>
          </div>
          <div className="stat-card">
            <Trophy size={16} />
            <span className="stat-card-value">{user.stats.totalWins}</span>
            <span className="stat-card-label">Wins</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-value">{user.stats.totalRaces}</span>
            <span className="stat-card-label">Races</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-value">{user.stats.bestAccuracy}%</span>
            <span className="stat-card-label">Best Accuracy</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-value">{user.stats.avgAccuracy}%</span>
            <span className="stat-card-label">Avg Accuracy</span>
          </div>
        </div>
      )}

      {user.isGuest && (
        <div className="profile-guest-note">
          <p>
            Guest accounts don't persist stats. Register to save your progress!
          </p>
        </div>
      )}

      {recentMatches.length > 0 && (
        <div className="profile-history">
          <h3>Recent Matches</h3>
          <div className="profile-matches">
            {recentMatches.map((m) => (
              <div key={m.id} className="profile-match-row">
                <span className="match-mode">{m.mode}</span>
                <span className="match-wpm">{m.wpm} WPM</span>
                <span className="match-acc">{m.accuracy}%</span>
                <span className="match-pos">
                  #{m.position}/{m.totalPlayers}
                </span>
                <span className="match-date">
                  {new Date(m.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
