import { useState } from "react";
import { useAuthStore } from "../stores/authStore";
import {
  Settings as SettingsIcon,
  Monitor,
  Palette,
  Lock,
  ArrowLeft,
  MousePointer2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { APP_NAME, APP_VERSION } from "../constants/app";

const API_BASE =
  (import.meta.env.VITE_API_BASE as string) ||
  `http://${window.location.hostname}:3005/api`;

const CURSOR_STYLES = [
  { value: "line", label: "Line", preview: "│" },
  { value: "block", label: "Block", preview: "█" },
  { value: "underline", label: "Underline", preview: "_" },
  { value: "pulse", label: "Pulse", preview: "⚡" },
] as const;

const CURSOR_COLORS = [
  "#e2b714",
  "#e74c3c",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
  "#e67e22",
  "#1abc9c",
  "#fd79a8",
  "#ffffff",
  "#00cec9",
];

export function Settings() {
  const { user, token, updatePreferences } = useAuthStore();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(user?.preferences?.theme || "dark");
  const [cursorStyle, setCursorStyle] = useState(
    user?.preferences?.cursorStyle || "line",
  );
  const [cursorColor, setCursorColor] = useState(
    user?.preferences?.cursorColor || "#e2b714",
  );
  const [fontSize, setFontSize] = useState<number>(
    (user?.preferences?.fontSize as number) || 24,
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const savePreferences = async (prefs: Record<string, any>) => {
    updatePreferences(prefs as any);
    if (token && !user?.isGuest) {
      try {
        await fetch(`${API_BASE}/auth/preferences`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(prefs),
        });
        toast.success("Preferences saved");
      } catch {
        toast.error("Failed to save preferences");
      }
    }
  };

  const handleThemeChange = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    savePreferences({ theme: newTheme });
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const handleCursorStyleChange = (style: string) => {
    setCursorStyle(style as any);
    savePreferences({ cursorStyle: style });
  };

  const handleCursorColorChange = (color: string) => {
    setCursorColor(color);
    savePreferences({ cursorColor: color });
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    savePreferences({ fontSize: size });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <button className="btn-icon-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </button>
        <SettingsIcon size={22} />
        <h2>Settings</h2>
      </div>

      {/* Theme */}
      <div className="settings-section">
        <h3>
          <Monitor size={16} /> Appearance
        </h3>
        <div className="settings-option">
          <label>Theme</label>
          <div className="theme-options">
            <button
              className={`theme-btn ${theme === "dark" ? "active" : ""}`}
              onClick={() => handleThemeChange("dark")}
            >
              Dark
            </button>
            <button
              className={`theme-btn ${theme === "light" ? "active" : ""}`}
              onClick={() => handleThemeChange("light")}
            >
              Light
            </button>
          </div>
        </div>
        <div className="settings-option">
          <label>Typing Font Size</label>
          <div className="font-size-options">
            {[16, 20, 24, 28, 32].map((s) => (
              <button
                key={s}
                className={`font-size-btn ${fontSize === s ? "active" : ""}`}
                onClick={() => handleFontSizeChange(s)}
              >
                {s}px
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cursor Customization */}
      <div className="settings-section">
        <h3>
          <MousePointer2 size={16} /> Cursor
        </h3>
        <div className="settings-option" style={{ marginBottom: 16 }}>
          <label>Cursor Style</label>
          <div className="cursor-style-options">
            {CURSOR_STYLES.map((s) => (
              <button
                key={s.value}
                className={`cursor-style-btn ${cursorStyle === s.value ? "active" : ""}`}
                onClick={() => handleCursorStyleChange(s.value)}
              >
                <span className="cursor-preview">{s.preview}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="settings-option">
          <label>Cursor Color</label>
          <div className="cursor-color-options">
            {CURSOR_COLORS.map((c) => (
              <button
                key={c}
                className={`cursor-color-btn ${cursorColor === c ? "active" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => handleCursorColorChange(c)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Password Change (only for registered users) */}
      {!user?.isGuest && (
        <div className="settings-section">
          <h3>
            <Lock size={16} /> Change Password
          </h3>
          <form className="password-form" onSubmit={handlePasswordChange}>
            <input
              type="password"
              className="input"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
              type="password"
              className="input"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              className="input"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!currentPassword || !newPassword}
            >
              Update Password
            </button>
          </form>
        </div>
      )}

      {/* Info */}
      <div className="settings-section">
        <h3>
          <Palette size={16} /> About
        </h3>
        <div className="settings-about">
          <p>
            {APP_NAME} v{APP_VERSION}
          </p>
          <p>A competitive multiplayer typing race game.</p>
        </div>
      </div>
    </div>
  );
}
