import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Apply saved theme on load
const savedState = localStorage.getItem("typestrike-auth");
if (savedState) {
  try {
    const parsed = JSON.parse(savedState);
    const theme = parsed?.state?.user?.preferences?.theme;
    if (theme) document.documentElement.setAttribute("data-theme", theme);
  } catch {
    /* ignore */
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
