import { useState, useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Users,
  Activity,
  TrendingUp,
  Ban,
  Check,
  Trash2,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import toast from "react-hot-toast";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const API_BASE =
  (import.meta.env.VITE_API_BASE as string) ||
  `http://${window.location.hostname}:3005/api`;

interface DashboardData {
  overview: {
    totalUsers: number;
    totalGuests: number;
    totalRegistered: number;
    blockedUsers: number;
    totalMatches: number;
    matchesToday: number;
    usersToday: number;
    avgWpm: number;
    avgAccuracy: number;
  };
  charts: {
    matchesPerDay: { _id: string; count: number }[];
    usersPerDay: { _id: string; count: number }[];
    wpmDistribution: { _id: string | number; count: number }[];
  };
  topPlayers: any[];
}

interface UserEntry {
  _id: string;
  username: string;
  isGuest: boolean;
  role: string;
  isBlocked: boolean;
  blockedReason?: string;
  stats: { totalRaces: number; bestWpm: number; avgWpm: number };
  createdAt: string;
}

export function AdminDashboard() {
  const { token, user } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "users" | "analytics">(
    "overview",
  );
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [usersPagination, setUsersPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    if (user?.role !== "admin") {
      navigate("/");
      return;
    }
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (tab === "users") fetchUsers();
    if (tab === "analytics") fetchAnalytics();
  }, [tab, usersPagination.page, searchQuery, userFilter]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard`, { headers });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setDashboard(data);
    } catch {
      toast.error("Failed to load admin dashboard");
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: String(usersPagination.page),
        limit: "15",
        search: searchQuery,
        filter: userFilter,
      });
      const res = await fetch(`${API_BASE}/admin/users?${params}`, { headers });
      const data = await res.json();
      setUsers(data.users || []);
      setUsersPagination(
        data.pagination || { page: 1, totalPages: 1, total: 0 },
      );
    } catch {
      toast.error("Failed to load users");
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/analytics`, { headers });
      const data = await res.json();
      setAnalytics(data);
    } catch {
      toast.error("Failed to load analytics");
    }
  };

  const handleBlock = async (userId: string, username: string) => {
    const reason = prompt(`Reason for blocking ${username}?`);
    if (reason === null) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/block`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${username} blocked`);
      fetchUsers();
      fetchDashboard();
    } catch {
      toast.error("Failed to block user");
    }
  };

  const handleUnblock = async (userId: string, username: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/unblock`, {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${username} unblocked`);
      fetchUsers();
      fetchDashboard();
    } catch {
      toast.error("Failed to unblock user");
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${username} deleted`);
      fetchUsers();
      fetchDashboard();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const handleMakeAdmin = async (userId: string, username: string) => {
    if (!confirm(`Make "${username}" an admin?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/make-admin`, {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${username} is now admin`);
      fetchUsers();
    } catch {
      toast.error("Failed to promote user");
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="skeleton-loader">
          <div className="skeleton-block skeleton-lg" />
          <div className="skeleton-row">
            <div className="skeleton-block" />
            <div className="skeleton-block" />
            <div className="skeleton-block" />
          </div>
        </div>
      </div>
    );
  }

  const chartColors = {
    bg: "transparent",
    grid: "#1f2125",
    text: "#6b7280",
    accent: "#e2b714",
    success: "#4ade80",
    error: "#e74c3c",
  };

  return (
    <div className="admin-page">
      <div className="page-header">
        <button className="btn-icon-sm" onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
        </button>
        <Shield size={22} />
        <h2>Admin Dashboard</h2>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === "overview" ? "active" : ""}`}
          onClick={() => setTab("overview")}
        >
          <Activity size={14} /> Overview
        </button>
        <button
          className={`admin-tab ${tab === "users" ? "active" : ""}`}
          onClick={() => setTab("users")}
        >
          <Users size={14} /> Users
        </button>
        <button
          className={`admin-tab ${tab === "analytics" ? "active" : ""}`}
          onClick={() => setTab("analytics")}
        >
          <BarChart3 size={14} /> Analytics
        </button>
      </div>

      {/* Overview Tab */}
      {tab === "overview" && dashboard && (
        <div className="admin-overview">
          <div className="admin-stat-cards">
            <div className="admin-stat-card">
              <Users size={20} />
              <span className="admin-stat-value">
                {dashboard.overview.totalUsers}
              </span>
              <span className="admin-stat-label">Total Users</span>
            </div>
            <div className="admin-stat-card">
              <Activity size={20} />
              <span className="admin-stat-value">
                {dashboard.overview.totalMatches}
              </span>
              <span className="admin-stat-label">Total Matches</span>
            </div>
            <div className="admin-stat-card">
              <TrendingUp size={20} />
              <span className="admin-stat-value">
                {dashboard.overview.avgWpm}
              </span>
              <span className="admin-stat-label">Avg WPM</span>
            </div>
            <div className="admin-stat-card">
              <Ban size={20} />
              <span className="admin-stat-value">
                {dashboard.overview.blockedUsers}
              </span>
              <span className="admin-stat-label">Blocked</span>
            </div>
          </div>

          <div className="admin-detail-row">
            <div className="admin-stat-card admin-stat-small">
              <span className="admin-stat-label">Today</span>
              <span className="admin-stat-value">
                {dashboard.overview.matchesToday} matches ·{" "}
                {dashboard.overview.usersToday} new users
              </span>
            </div>
            <div className="admin-stat-card admin-stat-small">
              <span className="admin-stat-label">Breakdown</span>
              <span className="admin-stat-value">
                {dashboard.overview.totalRegistered} registered ·{" "}
                {dashboard.overview.totalGuests} guests
              </span>
            </div>
          </div>

          {/* Charts */}
          <div className="admin-charts-grid">
            <div className="admin-chart-card">
              <h4>Matches Per Day (30d)</h4>
              <div className="admin-chart-container">
                <Line
                  data={{
                    labels: dashboard.charts.matchesPerDay.map((d) =>
                      d._id.slice(5),
                    ),
                    datasets: [
                      {
                        label: "Matches",
                        data: dashboard.charts.matchesPerDay.map(
                          (d) => d.count,
                        ),
                        borderColor: chartColors.accent,
                        backgroundColor: "rgba(226,183,20,0.1)",
                        fill: true,
                        tension: 0.3,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: {
                        ticks: { color: chartColors.text },
                        grid: { color: chartColors.grid },
                      },
                      y: {
                        ticks: { color: chartColors.text },
                        grid: { color: chartColors.grid },
                      },
                    },
                  }}
                />
              </div>
            </div>
            <div className="admin-chart-card">
              <h4>User Growth (30d)</h4>
              <div className="admin-chart-container">
                <Bar
                  data={{
                    labels: dashboard.charts.usersPerDay.map((d) =>
                      d._id.slice(5),
                    ),
                    datasets: [
                      {
                        label: "New Users",
                        data: dashboard.charts.usersPerDay.map((d) => d.count),
                        backgroundColor: "rgba(74,222,128,0.6)",
                        borderColor: chartColors.success,
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: {
                        ticks: { color: chartColors.text },
                        grid: { color: chartColors.grid },
                      },
                      y: {
                        ticks: { color: chartColors.text },
                        grid: { color: chartColors.grid },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Top Players */}
          <div className="admin-section">
            <h4>Top Players</h4>
            <div className="admin-table">
              {dashboard.topPlayers.map((p: any, idx: number) => (
                <div key={p._id} className="admin-table-row">
                  <span className="admin-table-rank">#{idx + 1}</span>
                  <span className="admin-table-name">{p.username}</span>
                  <span className="admin-table-stat">
                    {p.stats.bestWpm} wpm
                  </span>
                  <span className="admin-table-stat">
                    {p.stats.totalRaces} races
                  </span>
                  <span
                    className={`admin-badge ${p.isBlocked ? "blocked" : p.role}`}
                  >
                    {p.isBlocked ? "Blocked" : p.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <div className="admin-users">
          <div className="admin-users-toolbar">
            <div className="admin-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setUsersPagination((p) => ({ ...p, page: 1 }));
                }}
                className="input"
              />
            </div>
            <div className="admin-filter-btns">
              {["all", "registered", "guests", "blocked", "admins"].map((f) => (
                <button
                  key={f}
                  className={`btn btn-sm ${userFilter === f ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => {
                    setUserFilter(f);
                    setUsersPagination((p) => ({ ...p, page: 1 }));
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-table">
            <div className="admin-table-header">
              <span>Username</span>
              <span>Role</span>
              <span>Races</span>
              <span>Best WPM</span>
              <span>Status</span>
              <span>Joined</span>
              <span>Actions</span>
            </div>
            {users.map((u) => (
              <div
                key={u._id}
                className={`admin-table-row ${u.isBlocked ? "row-blocked" : ""}`}
              >
                <span className="admin-table-name">
                  {u.username}
                  {u.isGuest && <span className="guest-badge">GUEST</span>}
                </span>
                <span className={`admin-badge ${u.role}`}>{u.role}</span>
                <span>{u.stats?.totalRaces || 0}</span>
                <span>{u.stats?.bestWpm || 0}</span>
                <span
                  className={`admin-badge ${u.isBlocked ? "blocked" : "active"}`}
                >
                  {u.isBlocked ? "Blocked" : "Active"}
                </span>
                <span className="admin-table-date">
                  {new Date(u.createdAt).toLocaleDateString()}
                </span>
                <span className="admin-actions">
                  {u.role !== "admin" && (
                    <>
                      {u.isBlocked ? (
                        <button
                          className="btn-icon-sm"
                          title="Unblock"
                          onClick={() => handleUnblock(u._id, u.username)}
                        >
                          <Check size={12} />
                        </button>
                      ) : (
                        <button
                          className="btn-icon-sm"
                          title="Block"
                          onClick={() => handleBlock(u._id, u.username)}
                        >
                          <Ban size={12} />
                        </button>
                      )}
                      <button
                        className="btn-icon-sm"
                        title="Make Admin"
                        onClick={() => handleMakeAdmin(u._id, u.username)}
                      >
                        <Shield size={12} />
                      </button>
                      <button
                        className="btn-icon-sm btn-danger"
                        title="Delete"
                        onClick={() => handleDelete(u._id, u.username)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="admin-pagination">
            <span>
              Page {usersPagination.page} of {usersPagination.totalPages} (
              {usersPagination.total} users)
            </span>
            <div className="admin-pagination-btns">
              <button
                className="btn btn-sm btn-ghost"
                disabled={usersPagination.page <= 1}
                onClick={() =>
                  setUsersPagination((p) => ({ ...p, page: p.page - 1 }))
                }
              >
                <ChevronLeft size={14} />
              </button>
              <button
                className="btn btn-sm btn-ghost"
                disabled={usersPagination.page >= usersPagination.totalPages}
                onClick={() =>
                  setUsersPagination((p) => ({ ...p, page: p.page + 1 }))
                }
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {tab === "analytics" && analytics && (
        <div className="admin-analytics">
          <div className="admin-charts-grid">
            <div className="admin-chart-card">
              <h4>Game Mode Distribution</h4>
              <div className="admin-chart-container admin-chart-sm">
                <Doughnut
                  data={{
                    labels: analytics.modeDistribution.map((m: any) => m._id),
                    datasets: [
                      {
                        data: analytics.modeDistribution.map(
                          (m: any) => m.count,
                        ),
                        backgroundColor: [
                          "#e2b714",
                          "#4ade80",
                          "#3498db",
                          "#9b59b6",
                        ],
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { labels: { color: chartColors.text } },
                    },
                  }}
                />
              </div>
            </div>
            <div className="admin-chart-card">
              <h4>Hourly Activity (7d)</h4>
              <div className="admin-chart-container">
                <Bar
                  data={{
                    labels: analytics.hourlyActivity.map(
                      (h: any) => `${h._id}:00`,
                    ),
                    datasets: [
                      {
                        label: "Matches",
                        data: analytics.hourlyActivity.map((h: any) => h.count),
                        backgroundColor: "rgba(226,183,20,0.5)",
                        borderColor: chartColors.accent,
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: {
                        ticks: { color: chartColors.text },
                        grid: { color: chartColors.grid },
                      },
                      y: {
                        ticks: { color: chartColors.text },
                        grid: { color: chartColors.grid },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          <div className="admin-section">
            <h4>Platform Stats</h4>
            <div className="admin-stat-cards">
              <div className="admin-stat-card">
                <span className="admin-stat-value">
                  {Math.round(analytics.avgDuration / 1000)}s
                </span>
                <span className="admin-stat-label">Avg Match Duration</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-value">
                  {analytics.activePlayersLast7Days}
                </span>
                <span className="admin-stat-label">Active (7d)</span>
              </div>
            </div>
          </div>

          <div className="admin-section">
            <h4>Top WPM All Time</h4>
            <div className="admin-table">
              {analytics.topWpm?.map((p: any, idx: number) => (
                <div key={p._id} className="admin-table-row">
                  <span className="admin-table-rank">#{idx + 1}</span>
                  <span className="admin-table-name">{p.username}</span>
                  <span className="admin-table-stat">
                    {p.stats.bestWpm} best
                  </span>
                  <span className="admin-table-stat">{p.stats.avgWpm} avg</span>
                  <span className="admin-table-stat">
                    {p.stats.totalRaces} races
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
