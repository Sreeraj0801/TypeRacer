export interface RoomRules {
  timeLimit: number;
  allowBackspace: boolean;
  minAccuracy: number;
  showLiveWpm: boolean;
  showLiveAccuracy: boolean;
  autoStart: boolean;
  maxPlayers: number;
}

export interface RoomSettings {
  mode: "words" | "custom" | "code";
  wordCount: number;
  language: "javascript" | "typescript" | "python" | "rust" | "go";
  customText: string;
  difficulty: "easy" | "medium" | "hard";
  textType: "words" | "sentences" | "paragraphs" | "quotes";
  rules: RoomRules;
}

export interface PlayerData {
  id: string;
  name: string;
  progress: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  finishTime: number | null;
  position: number | null;
  currentIndex: number;
}

export type GameMode = "practice" | "online" | "local";

export interface RoomData {
  id: string;
  hostId: string;
  state: "waiting" | "countdown" | "racing" | "finished";
  players: PlayerData[];
  settings: RoomSettings;
  text: string;
  startTime: number | null;
  finishOrder: string[];
  gameMode: GameMode;
}

export interface ChatMessage {
  playerName: string;
  message: string;
  timestamp: number;
}

export interface UserStats {
  totalRaces: number;
  totalWins: number;
  bestWpm: number;
  avgWpm: number;
  bestAccuracy: number;
  avgAccuracy: number;
  totalCharsTyped: number;
  totalTimeTyping: number;
}

export interface UserData {
  id: string;
  username: string;
  isGuest: boolean;
  role?: "user" | "admin";
  stats: UserStats;
  preferences: {
    theme: "dark" | "light";
    cursorStyle?: "line" | "block" | "underline" | "pulse";
    cursorColor?: string;
    fontSize?: number;
  };
}

export interface LeaderboardEntry {
  username: string;
  bestWpm: number;
  avgWpm: number;
  bestAccuracy: number;
  avgAccuracy: number;
  totalRaces: number;
  totalWins: number;
  winRate: number;
}

export interface MatchHistory {
  id: string;
  mode: GameMode;
  wpm: number;
  accuracy: number;
  position: number;
  totalPlayers: number;
  date: string;
  settings: {
    difficulty: string;
    wordCount: number;
    textType: string;
  };
}

export interface PublicRoom {
  id: string;
  players: number;
  maxPlayers: number;
  hostId: string;
  state: string;
  gameMode: string;
}
