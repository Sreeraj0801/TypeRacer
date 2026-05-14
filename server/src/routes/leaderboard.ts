import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Match from "../models/Match";

const router = Router();

// Get global leaderboard (top players by best WPM)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const topPlayers = await User.find({ "stats.totalRaces": { $gt: 0 } })
      .select(
        "username stats.bestWpm stats.avgWpm stats.bestAccuracy stats.avgAccuracy stats.totalRaces stats.totalWins",
      )
      .sort({ "stats.bestWpm": -1 })
      .limit(50);

    return res.json(
      topPlayers.map((p) => ({
        username: p.username,
        bestWpm: p.stats.bestWpm,
        avgWpm: p.stats.avgWpm,
        bestAccuracy: p.stats.bestAccuracy,
        avgAccuracy: p.stats.avgAccuracy,
        totalRaces: p.stats.totalRaces,
        totalWins: p.stats.totalWins,
        winRate:
          p.stats.totalRaces > 0
            ? Math.round((p.stats.totalWins / p.stats.totalRaces) * 100)
            : 0,
      })),
    );
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

// Get user match history
router.get("/history", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: "Server config error" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secret) as {
      userId: string;
      username: string;
    };

    const matches = await Match.find({ "players.userId": decoded.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const history = matches.map((match) => {
      const playerData = match.players.find((p) => p.userId === decoded.userId);
      return {
        id: match._id,
        mode: match.mode,
        wpm: playerData?.wpm || 0,
        accuracy: playerData?.accuracy || 0,
        position: playerData?.position || 0,
        totalPlayers: match.players.length,
        date: match.createdAt,
        settings: match.settings,
      };
    });

    return res.json(history);
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

// Get user stats with chart data
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: "Server config error" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secret) as { userId: string };

    const user = await User.findById(decoded.userId).select("stats");
    if (!user) return res.status(404).json({ error: "User not found" });

    // Get last 20 matches for chart data
    const recentMatches = await Match.find({ "players.userId": decoded.userId })
      .sort({ createdAt: -1 })
      .limit(20);

    const chartData = recentMatches.reverse().map((match) => {
      const playerData = match.players.find((p) => p.userId === decoded.userId);
      return {
        date: match.createdAt,
        wpm: playerData?.wpm || 0,
        accuracy: playerData?.accuracy || 0,
      };
    });

    return res.json({
      stats: user.stats,
      chartData,
    });
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
