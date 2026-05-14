export interface RoomSettings {
  mode: "words" | "custom" | "code";
  wordCount: number;
  language: "javascript" | "typescript" | "python" | "rust" | "go";
  customText: string;
  difficulty: "easy" | "medium" | "hard";
  textType: "words" | "sentences" | "paragraphs" | "quotes";
  rules: RoomRules;
}

export interface RoomRules {
  timeLimit: number; // seconds, 0 = no limit
  allowBackspace: boolean;
  minAccuracy: number; // 0-100, 0 = no minimum
  showLiveWpm: boolean;
  showLiveAccuracy: boolean;
  autoStart: boolean; // auto start when all ready
  maxPlayers: number; // 2-8
}

export interface Player {
  name: string;
  progress: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  finishTime: number | null;
  position: number | null;
  currentIndex: number;
  correctChars: number;
  totalChars: number;
}

export interface RoomData {
  id: string;
  hostId: string;
  state: RoomState;
  players: PlayerData[];
  settings: RoomSettings;
  text: string;
  startTime: number | null;
  finishOrder: string[];
  gameMode: "practice" | "online" | "local";
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

export type RoomState = "waiting" | "countdown" | "racing" | "finished";

export interface Room {
  id: string;
  hostId: string;
  state: RoomState;
  players: Map<string, Player>;
  settings: RoomSettings;
  text: string;
  startTime: number | null;
  finishOrder: string[];
  gameMode: "practice" | "online" | "local";
}

export interface ChatMessage {
  playerName: string;
  message: string;
  timestamp: number;
}
