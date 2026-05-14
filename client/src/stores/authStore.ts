import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserData } from "../types";

const API_BASE =
  (import.meta.env.VITE_API_BASE as string) ||
  `http://${window.location.hostname}:3005/api`;

interface AuthState {
  user: UserData | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  loginAsGuest: (username: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updatePreferences: (prefs: Partial<UserData["preferences"]>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Login failed");
          set({ user: data.user, token: data.token, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      register: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Registration failed");
          set({ user: data.user, token: data.token, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      loginAsGuest: async (username: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/auth/guest`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Guest login failed");
          set({
            user: {
              id: data.tempId || `guest_${username}`,
              username: data.username || username,
              isGuest: true,
              stats: {
                totalRaces: 0,
                totalWins: 0,
                bestWpm: 0,
                avgWpm: 0,
                bestAccuracy: 0,
                avgAccuracy: 0,
                totalCharsTyped: 0,
                totalTimeTyping: 0,
              },
              preferences: { theme: "dark" },
            },
            token: data.token || null,
            isLoading: false,
          });
        } catch (err: any) {
          // If guest endpoint fails, just set as local guest
          set({
            user: {
              id: `guest_${Date.now()}`,
              username,
              isGuest: true,
              stats: {
                totalRaces: 0,
                totalWins: 0,
                bestWpm: 0,
                avgWpm: 0,
                bestAccuracy: 0,
                avgAccuracy: 0,
                totalCharsTyped: 0,
                totalTimeTyping: 0,
              },
              preferences: { theme: "dark" },
            },
            token: null,
            isLoading: false,
            error: null,
          });
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
      },

      clearError: () => set({ error: null }),

      updatePreferences: (prefs) => {
        const { user } = get();
        if (user) {
          set({
            user: { ...user, preferences: { ...user.preferences, ...prefs } },
          });
        }
      },
    }),
    {
      name: "typestrike-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
);
