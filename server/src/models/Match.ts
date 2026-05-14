import mongoose, { Schema, Document } from "mongoose";

export interface IMatchPlayer {
  userId?: string;
  username: string;
  wpm: number;
  accuracy: number;
  position: number;
  finishTime: number;
  charsTyped: number;
}

export interface IMatch extends Document {
  roomId: string;
  mode: "practice" | "online" | "local";
  text: string;
  players: IMatchPlayer[];
  settings: {
    difficulty: string;
    wordCount: number;
    textType: string;
  };
  startedAt: Date;
  endedAt: Date;
  createdAt: Date;
}

const MatchPlayerSchema = new Schema<IMatchPlayer>(
  {
    userId: { type: String },
    username: { type: String, required: true },
    wpm: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    position: { type: Number, required: true },
    finishTime: { type: Number, required: true },
    charsTyped: { type: Number, default: 0 },
  },
  { _id: false },
);

const MatchSchema = new Schema<IMatch>(
  {
    roomId: { type: String, required: true },
    mode: {
      type: String,
      enum: ["practice", "online", "local"],
      required: true,
    },
    text: { type: String, required: true },
    players: [MatchPlayerSchema],
    settings: {
      difficulty: { type: String, default: "medium" },
      wordCount: { type: Number, default: 30 },
      textType: { type: String, default: "words" },
    },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
  },
  { timestamps: true },
);

MatchSchema.index({ "players.userId": 1 });
MatchSchema.index({ createdAt: -1 });

export default mongoose.model<IMatch>("Match", MatchSchema);
