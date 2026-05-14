import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  password: string;
  isGuest: boolean;
  role: "user" | "admin";
  isAdmin?: boolean;
  isBlocked: boolean;
  blockedAt?: Date;
  blockedReason?: string;
  stats: {
    totalRaces: number;
    totalWins: number;
    bestWpm: number;
    avgWpm: number;
    bestAccuracy: number;
    avgAccuracy: number;
    totalCharsTyped: number;
    totalTimeTyping: number;
  };
  preferences: {
    theme: "dark" | "light";
    cursorStyle: "line" | "block" | "underline" | "pulse";
    cursorColor: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    password: {
      type: String,
      required: true,
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedAt: { type: Date },
    blockedReason: { type: String },
    stats: {
      totalRaces: { type: Number, default: 0 },
      totalWins: { type: Number, default: 0 },
      bestWpm: { type: Number, default: 0 },
      avgWpm: { type: Number, default: 0 },
      bestAccuracy: { type: Number, default: 0 },
      avgAccuracy: { type: Number, default: 0 },
      totalCharsTyped: { type: Number, default: 0 },
      totalTimeTyping: { type: Number, default: 0 },
    },
    preferences: {
      theme: { type: String, enum: ["dark", "light"], default: "dark" },
      cursorStyle: {
        type: String,
        enum: ["line", "block", "underline", "pulse"],
        default: "line",
      },
      cursorColor: { type: String, default: "#e2b714" },
      fontSize: { type: Number, default: 24 },
    },
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", UserSchema);
