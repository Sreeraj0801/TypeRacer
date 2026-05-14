import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { getWords } from "./words";
import { connectDB } from "./db";
import { Room, RoomData, RoomSettings, PlayerData, RoomState } from "./types";
import authRoutes from "./routes/auth";
import leaderboardRoutes from "./routes/leaderboard";
import adminRoutes from "./routes/admin";
import User from "./models/User";
import Match from "./models/Match";

// Validate required environment variables
const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app = express();
// CORS: allow specific origins via CORS_ORIGIN (comma-separated), or allow all when not set
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin: any, callback: any) => {
      // allow non-browser requests (no origin) and allow all if no env is set
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/admin", adminRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false,
  },
  transports: ["polling", "websocket"],
});

const rooms = new Map<string, Room>();

// Track authenticated users per socket
const socketUserMap = new Map<string, { userId: string; username: string }>();

const DEFAULT_RULES = {
  timeLimit: 0,
  allowBackspace: true,
  minAccuracy: 0,
  showLiveWpm: true,
  showLiveAccuracy: true,
  autoStart: false,
  maxPlayers: 8,
};

function createRoom(
  hostId: string,
  hostName: string,
  settings: Partial<RoomSettings>,
  gameMode: "practice" | "online" | "local" = "local",
): Room {
  const roomId = uuidv4().slice(0, 6).toUpperCase();
  const room: Room = {
    id: roomId,
    hostId,
    state: "waiting",
    players: new Map(),
    settings: {
      mode: settings.mode || "words",
      wordCount: settings.wordCount || 30,
      language: settings.language || "javascript",
      customText: settings.customText || "",
      difficulty: settings.difficulty || "medium",
      textType: settings.textType || "words",
      rules: { ...DEFAULT_RULES, ...settings.rules },
    },
    text: "",
    startTime: null,
    finishOrder: [],
    gameMode,
  };
  rooms.set(roomId, room);
  // Broadcast rooms list update
  io.emit("rooms-list", getRoomsList());
  return room;
}

function getRoomsList() {
  const list = [] as Array<{
    id: string;
    players: number;
    maxPlayers: number;
    hostId: string;
    state: RoomState;
    gameMode: string;
  }>;
  rooms.forEach((room) => {
    // Only show online rooms in the public list
    if (room.gameMode === "online") {
      list.push({
        id: room.id,
        players: room.players.size,
        maxPlayers: room.settings.rules.maxPlayers || DEFAULT_RULES.maxPlayers,
        hostId: room.hostId,
        state: room.state,
        gameMode: room.gameMode,
      });
    }
  });
  return list;
}

function getRoomData(room: Room): RoomData {
  const players: PlayerData[] = [];
  room.players.forEach((player, id) => {
    players.push({
      id,
      name: player.name,
      progress: player.progress,
      wpm: player.wpm,
      accuracy: player.accuracy,
      finished: player.finished,
      finishTime: player.finishTime,
      position: player.position,
      currentIndex: player.currentIndex,
    });
  });
  return {
    id: room.id,
    hostId: room.hostId,
    state: room.state,
    players,
    settings: room.settings,
    text: room.text,
    startTime: room.startTime,
    finishOrder: room.finishOrder,
    gameMode: room.gameMode || "local",
  };
}

function handlePlayerLeave(socketId: string, roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.delete(socketId);

  if (room.players.size === 0) {
    rooms.delete(roomId);
    console.log(`Room ${roomId} deleted (empty)`);
    return;
  }

  if (room.hostId === socketId) {
    const newHostId = room.players.keys().next().value;
    if (newHostId) room.hostId = newHostId;
  }

  io.to(roomId).emit("room-updated", getRoomData(room));
  // Broadcast rooms list update
  io.emit("rooms-list", getRoomsList());
}

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Authenticate socket (optional - for logged in users)
  socket.on("authenticate", ({ token }: { token: string }, callback) => {
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
        userId: string;
        username: string;
      };
      socketUserMap.set(socket.id, {
        userId: decoded.userId,
        username: decoded.username,
      });
      callback?.({ success: true, username: decoded.username });
    } catch {
      callback?.({ success: false });
    }
  });

  socket.on(
    "create-room",
    (
      {
        playerName,
        settings,
        gameMode,
      }: {
        playerName: string;
        settings: Partial<RoomSettings>;
        gameMode?: "practice" | "online" | "local";
      },
      callback,
    ) => {
      const room = createRoom(
        socket.id,
        playerName,
        settings,
        gameMode || "local",
      );
      room.players.set(socket.id, {
        name: playerName,
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false,
        finishTime: null,
        position: null,
        currentIndex: 0,
        correctChars: 0,
        totalChars: 0,
      });
      socket.join(room.id);
      callback({ success: true, room: getRoomData(room) });
      console.log(
        `Room created: ${room.id} by ${playerName} [${gameMode || "local"}]`,
      );
    },
  );

  socket.on(
    "join-room",
    (
      { roomId, playerName }: { roomId: string; playerName: string },
      callback,
    ) => {
      const room = rooms.get(roomId.toUpperCase());
      if (!room) {
        callback({ success: false, error: "Room not found" });
        return;
      }
      if (room.state !== "waiting") {
        callback({ success: false, error: "Race already in progress" });
        return;
      }
      if (room.players.size >= (room.settings.rules.maxPlayers || 8)) {
        callback({
          success: false,
          error: `Room is full (max ${room.settings.rules.maxPlayers} players)`,
        });
        return;
      }

      room.players.set(socket.id, {
        name: playerName,
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false,
        finishTime: null,
        position: null,
        currentIndex: 0,
        correctChars: 0,
        totalChars: 0,
      });
      socket.join(room.id);
      io.to(room.id).emit("room-updated", getRoomData(room));
      // Broadcast rooms list update
      io.emit("rooms-list", getRoomsList());
      callback({ success: true, room: getRoomData(room) });
      console.log(`${playerName} joined room ${room.id}`);
    },
  );

  socket.on(
    "update-settings",
    ({
      roomId,
      settings,
    }: {
      roomId: string;
      settings: Partial<RoomSettings>;
    }) => {
      const room = rooms.get(roomId);
      if (!room || room.hostId !== socket.id) return;
      if (settings.rules) {
        settings.rules = { ...room.settings.rules, ...settings.rules };
      }
      room.settings = { ...room.settings, ...settings };
      io.to(room.id).emit("room-updated", getRoomData(room));
      // Broadcast rooms list update
      io.emit("rooms-list", getRoomsList());
    },
  );

  socket.on("start-race", ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room || room.hostId !== socket.id) return;
    if (room.players.size < 1) return;

    room.text = getWords(room.settings);
    room.state = "countdown";
    room.finishOrder = [];

    room.players.forEach((player) => {
      player.progress = 0;
      player.wpm = 0;
      player.accuracy = 100;
      player.finished = false;
      player.finishTime = null;
      player.position = null;
      player.currentIndex = 0;
      player.correctChars = 0;
      player.totalChars = 0;
    });

    io.to(room.id).emit("race-countdown", getRoomData(room));

    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      io.to(room.id).emit("countdown-tick", count);
      if (count <= 0) {
        clearInterval(countdownInterval);
        room.state = "racing";
        room.startTime = Date.now();
        io.to(room.id).emit("race-start", getRoomData(room));

        // Set time limit if configured
        const timeLimit = room.settings.rules.timeLimit;
        if (timeLimit > 0) {
          setTimeout(() => {
            if (room.state === "racing") {
              room.state = "finished";
              room.players.forEach((p) => {
                if (!p.finished) {
                  p.finished = true;
                  p.finishTime = timeLimit * 1000;
                }
              });
              io.to(room.id).emit("race-finished", getRoomData(room));
              // Broadcast rooms list update
              io.emit("rooms-list", getRoomsList());
            }
          }, timeLimit * 1000);
        }
      }
    }, 1000);
  });

  socket.on(
    "typing-progress",
    ({
      roomId,
      currentIndex,
      correctChars,
      totalChars,
    }: {
      roomId: string;
      currentIndex: number;
      correctChars: number;
      totalChars: number;
    }) => {
      const room = rooms.get(roomId);
      if (!room || room.state !== "racing") return;

      const player = room.players.get(socket.id);
      if (!player || player.finished) return;

      player.currentIndex = currentIndex;
      player.correctChars = correctChars;
      player.totalChars = totalChars;
      player.progress = Math.min((currentIndex / room.text.length) * 100, 100);

      const elapsedTime =
        (Date.now() - (room.startTime || Date.now())) / 1000 / 60;
      if (elapsedTime > 0) {
        player.wpm = Math.round(correctChars / 5 / elapsedTime);
      }

      if (totalChars > 0) {
        player.accuracy = Math.round((correctChars / totalChars) * 100);
      }

      if (currentIndex >= room.text.length) {
        player.finished = true;
        player.finishTime = Date.now() - (room.startTime || Date.now());
        player.progress = 100;
        room.finishOrder.push(socket.id);

        // If all finished, assign positions by combined score (wpm * accuracy)
        let allFinished = true;
        room.players.forEach((p) => {
          if (!p.finished) allFinished = false;
        });

        if (allFinished) {
          // Compute scores and sort
          const playersArr = Array.from(room.players.entries());
          playersArr.sort((a, b) => {
            const scoreA = (a[1].wpm || 0) * ((a[1].accuracy || 0) / 100);
            const scoreB = (b[1].wpm || 0) * ((b[1].accuracy || 0) / 100);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return (a[1].finishTime || 0) - (b[1].finishTime || 0);
          });
          playersArr.forEach(([, p], idx) => {
            p.position = idx + 1;
          });
          room.state = "finished";
          io.to(room.id).emit("race-finished", getRoomData(room));

          // Save match to database
          saveMatch(room, playersArr);
        }
      }

      io.to(room.id).emit("player-progress", getRoomData(room));
      io.emit("rooms-list", getRoomsList());
    },
  );

  socket.on("leave-room", ({ roomId }: { roomId: string }) => {
    handlePlayerLeave(socket.id, roomId);
    socket.leave(roomId);
    io.emit("rooms-list", getRoomsList());
  });

  // Kick player (host only)
  socket.on(
    "kick-player",
    ({ roomId, playerId }: { roomId: string; playerId: string }) => {
      const room = rooms.get(roomId);
      if (!room || room.hostId !== socket.id) return;
      if (playerId === socket.id) return; // Can't kick yourself

      const player = room.players.get(playerId);
      if (!player) return;

      room.players.delete(playerId);
      // Notify kicked player
      io.to(playerId).emit("kicked-from-room", { roomId });
      // Remove from socket room
      const kickedSocket = io.sockets.sockets.get(playerId);
      if (kickedSocket) {
        kickedSocket.leave(roomId);
      }

      io.to(room.id).emit("room-updated", getRoomData(room));
      io.emit("rooms-list", getRoomsList());
      console.log(`${player.name} kicked from room ${roomId}`);
    },
  );

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    socketUserMap.delete(socket.id);
    rooms.forEach((room, roomId) => {
      if (room.players.has(socket.id)) {
        handlePlayerLeave(socket.id, roomId);
      }
    });
  });

  socket.on(
    "chat-message",
    ({ roomId, message }: { roomId: string; message: string }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.get(socket.id);
      if (!player) return;
      io.to(room.id).emit("chat-message", {
        playerName: player.name,
        message: message.slice(0, 200),
        timestamp: Date.now(),
      });
    },
  );

  socket.on("restart-race", ({ roomId }: { roomId: string }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Allow any player to restart. If host is not in the room, promote the requester.
    if (!room.players.has(room.hostId)) {
      room.hostId = socket.id;
    }

    // If the requester is not the host, promote them to host (first to click)
    if (room.hostId !== socket.id) {
      // Only allow non-host restart if game is finished
      if (room.state !== "finished") return;
      room.hostId = socket.id;
    }

    room.state = "waiting";
    room.text = "";
    room.startTime = null;
    room.finishOrder = [];
    room.players.forEach((player) => {
      player.progress = 0;
      player.wpm = 0;
      player.accuracy = 100;
      player.finished = false;
      player.finishTime = null;
      player.position = null;
      player.currentIndex = 0;
      player.correctChars = 0;
      player.totalChars = 0;
    });
    io.to(room.id).emit("room-updated", getRoomData(room));
    // Broadcast rooms list update
    io.emit("rooms-list", getRoomsList());
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", rooms: rooms.size });
});

app.get("/rooms", (_req, res) => {
  res.json({ rooms: getRoomsList() });
});

// Settings endpoint - returns env status (no secrets)
app.get("/api/settings/status", (_req, res) => {
  res.json({
    mongodb: !!process.env.MONGODB_URI,
    jwt: !!process.env.JWT_SECRET,
    port: process.env.PORT || 3005,
  });
});

// Seed admin account (only works if no admin exists)
app.post("/api/seed-admin", async (req, res) => {
  try {
    const bcrypt = require("bcryptjs");
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      // If caller provided username/password, update the existing admin
      const body = (req as any).body || {};
      if (body.username || body.password) {
        if (body.username) existingAdmin.username = body.username.toLowerCase();
        if (body.password) {
          existingAdmin.password = await bcrypt.hash(body.password, 10);
        }
        existingAdmin.isAdmin = true;
        await existingAdmin.save();
        return res.json({
          success: true,
          message: "Existing admin updated",
          username: existingAdmin.username,
          isAdmin: existingAdmin.isAdmin,
        });
      }
      // Ensure isAdmin flag is set for existing admin user
      if (!existingAdmin.isAdmin) {
        existingAdmin.isAdmin = true;
        await existingAdmin.save();
      }
      return res.json({
        success: true,
        message: "Admin already exists",
        username: existingAdmin.username,
        isAdmin: existingAdmin.isAdmin,
      });
    }
    // Prefer credentials from request body, then environment for security
    const body = (req as any).body || {};
    const adminUsername =
      body.username || process.env.ADMIN_USERNAME || "admin";
    let adminPasswordPlain = body.password || process.env.ADMIN_PASSWORD;

    // If no ADMIN_PASSWORD is provided, generate a secure random password
    if (!adminPasswordPlain) {
      const crypto = require("crypto");
      adminPasswordPlain = crypto
        .randomBytes(12)
        .toString("base64")
        .replace(/\+/g, "0")
        .replace(/\//g, "0");
      console.warn(
        "ADMIN_PASSWORD not set. Generated admin password (please store securely):",
        adminPasswordPlain,
      );
    }

    const passwordHash = await bcrypt.hash(adminPasswordPlain, 10);
    const admin = await User.create({
      username: adminUsername.toLowerCase(),
      password: passwordHash,
      isGuest: false,
      role: "admin",
      isAdmin: true,
    });

    return res.json({
      success: true,
      username: admin.username,
      // If ADMIN_PASSWORD was provided via env, do not return it in response.
      message: process.env.ADMIN_PASSWORD
        ? "Admin created. Credentials taken from environment."
        : `Admin created. Generated password: ${adminPasswordPlain} (store securely)`,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      // Username taken, update existing user to admin
      const adminUser = await User.findOneAndUpdate(
        { username: (process.env.ADMIN_USERNAME || "admin").toLowerCase() },
        { role: "admin", isAdmin: true },
        { new: true },
      );
      return res.json({
        success: true,
        message: "Existing admin user promoted",
        username: adminUser?.username,
      });
    }
    return res.status(500).json({ error: "Failed to create admin" });
  }
});

// Save match results to database and update user stats
async function saveMatch(room: Room, playersArr: [string, any][]) {
  try {
    const matchPlayers = playersArr.map(([socketId, p]) => {
      const userInfo = socketUserMap.get(socketId);
      return {
        userId: userInfo?.userId,
        username: p.name,
        wpm: p.wpm || 0,
        accuracy: p.accuracy || 0,
        position: p.position || 0,
        finishTime: p.finishTime || 0,
        charsTyped: p.totalChars || 0,
      };
    });

    await Match.create({
      roomId: room.id,
      mode: room.gameMode || "local",
      text: room.text,
      players: matchPlayers,
      settings: {
        difficulty: room.settings.difficulty,
        wordCount: room.settings.wordCount,
        textType: room.settings.textType,
      },
      startedAt: new Date(room.startTime || Date.now()),
      endedAt: new Date(),
    });

    // Update user stats for authenticated players
    for (const [socketId, p] of playersArr) {
      const userInfo = socketUserMap.get(socketId);
      if (!userInfo) continue;

      const user = await User.findById(userInfo.userId);
      if (!user) continue;

      const newTotalRaces = user.stats.totalRaces + 1;
      const newAvgWpm = Math.round(
        (user.stats.avgWpm * user.stats.totalRaces + (p.wpm || 0)) /
          newTotalRaces,
      );
      const newAvgAccuracy = Math.round(
        (user.stats.avgAccuracy * user.stats.totalRaces + (p.accuracy || 0)) /
          newTotalRaces,
      );

      await User.findByIdAndUpdate(userInfo.userId, {
        $set: {
          "stats.totalRaces": newTotalRaces,
          "stats.avgWpm": newAvgWpm,
          "stats.avgAccuracy": newAvgAccuracy,
          "stats.bestWpm": Math.max(user.stats.bestWpm, p.wpm || 0),
          "stats.bestAccuracy": Math.max(
            user.stats.bestAccuracy,
            p.accuracy || 0,
          ),
          "stats.totalCharsTyped":
            user.stats.totalCharsTyped + (p.totalChars || 0),
          "stats.totalTimeTyping":
            user.stats.totalTimeTyping + (p.finishTime || 0) / 1000,
        },
        $inc: {
          "stats.totalWins": p.position === 1 ? 1 : 0,
        },
      });
    }
  } catch (error) {
    console.error("Error saving match:", error);
  }
}

const PORT = Number(process.env.PORT) || 3005;

// Connect to MongoDB then start server
connectDB()
  .then(() => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`⚡ TYPE_STRIKE server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    // Start server anyway for development without DB
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`⚡ TYPE_STRIKE server running on port ${PORT} (no DB)`);
    });
  });
