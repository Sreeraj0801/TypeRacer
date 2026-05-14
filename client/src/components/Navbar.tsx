import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import {
  Keyboard,
  Trophy,
  Settings as SettingsIcon,
  LogOut,
  Shield,
} from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-logo">
          <Keyboard size={20} />
          <span>
            TYPE<span className="accent">_STRIKE</span>
          </span>
        </NavLink>

        <div className="navbar-links">
          <NavLink
            to="/"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            end
          >
            Home
          </NavLink>
          <NavLink
            to="/leaderboard"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <Trophy size={14} />
            Leaderboard
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <SettingsIcon size={14} />
            Settings
          </NavLink>
          {user?.role === "admin" && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Shield size={14} />
              Admin
            </NavLink>
          )}
        </div>

        <div className="navbar-user">
          {user && (
            <>
              <NavLink to="/profile" className="nav-user-btn">
                <span className="nav-avatar">
                  {user.username[0]}
                  {user.username[user.username.length - 1]}
                </span>
                <span>{user.username}</span>
                {user.isGuest && <span className="guest-badge">GUEST</span>}
              </NavLink>
              <button
                className="btn-icon-sm"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
