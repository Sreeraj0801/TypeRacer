import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./stores/authStore";
import { Navbar } from "./components/Navbar";
import { AuthPage } from "./components/AuthPage";
import { Dashboard } from "./components/Dashboard";
import { Lobby } from "./components/Lobby";
import { Race } from "./components/Race";
import { Results } from "./components/Results";
import { Leaderboard } from "./components/Leaderboard";
import { Profile } from "./components/Profile";
import { Settings } from "./components/Settings";
import { AdminDashboard } from "./components/AdminDashboard";
import { GameProvider, useGameContext } from "./components/GameProvider";
import "./index.css";

function AppRoutes() {
  const { user } = useAuthStore();
  const { view } = useGameContext();

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  // When in a game flow, render game views (no navbar for race - fullscreen)
  if (view === "lobby")
    return (
      <>
        <Navbar />
        <Lobby />
      </>
    );
  if (view === "race") return <Race />;
  if (view === "results") return <Results />;

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route
          path="/admin"
          element={
            user.role === "admin" ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <div className="app">
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              },
            }}
          />
        </div>
      </GameProvider>
    </BrowserRouter>
  );
}
