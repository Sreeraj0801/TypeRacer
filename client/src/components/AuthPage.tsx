import { useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { Keyboard } from "lucide-react";

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register" | "guest">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, register, loginAsGuest, isLoading, error, clearError } =
    useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (mode === "guest") {
        await loginAsGuest(username.trim());
      } else if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
    } catch {
      // error is set in store
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <Keyboard size={40} />
          <h1>
            TYPE<span className="accent">_STRIKE</span>
          </h1>
          <p className="auth-subtitle">Competitive Typing Races</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              clearError();
            }}
          >
            Login
          </button>
          <button
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => {
              setMode("register");
              clearError();
            }}
          >
            Register
          </button>
          <button
            className={`auth-tab ${mode === "guest" ? "active" : ""}`}
            onClick={() => {
              setMode("guest");
              clearError();
            }}
          >
            Guest
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (3-20 chars)"
              minLength={3}
              maxLength={20}
              required
              autoFocus
            />
          </div>

          {mode !== "guest" && (
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (4+ chars)"
                minLength={4}
                required
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary btn-large auth-submit"
            disabled={
              isLoading ||
              !username.trim() ||
              (mode !== "guest" && password.length < 4)
            }
          >
            {isLoading
              ? "Loading..."
              : mode === "guest"
                ? "Play as Guest"
                : mode === "login"
                  ? "Login"
                  : "Create Account"}
          </button>
        </form>

        {mode === "guest" && (
          <p className="auth-note">
            Guest accounts can play but stats won't be saved to leaderboard.
            Username must be unique.
          </p>
        )}
      </div>
    </div>
  );
}
