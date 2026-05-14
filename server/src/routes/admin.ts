import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import Match from "../models/Match";

const router = Router();

// Admin middleware
function adminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: "Server config error" });

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, secret) as {
      userId: string;
      username: string;
    };
    (req as any).userId = decoded.userId;
    (req as any).username = decoded.username;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Check admin role middleware
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await User.findById((req as any).userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
}

// GET /admin/dashboard - Overview stats
router.get(
  "/dashboard",
  adminAuth,
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const totalUsers = await User.countDocuments();
      const totalGuests = await User.countDocuments({ isGuest: true });
      const totalRegistered = await User.countDocuments({ isGuest: false });
      const blockedUsers = await User.countDocuments({ isBlocked: true });
      const totalMatches = await Match.countDocuments();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const matchesToday = await Match.countDocuments({
        createdAt: { $gte: todayStart },
      });
      const usersToday = await User.countDocuments({
        createdAt: { $gte: todayStart },
      });

      // Average WPM across all users
      const avgStats = await User.aggregate([
        { $match: { "stats.totalRaces": { $gt: 0 } } },
        {
          $group: {
            _id: null,
            avgWpm: { $avg: "$stats.avgWpm" },
            avgAccuracy: { $avg: "$stats.avgAccuracy" },
          },
        },
      ]);

      // Matches per day (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const matchesPerDay = await Match.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Users per day (last 30 days)
      const usersPerDay = await User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Top performers
      const topPlayers = await User.find({ "stats.totalRaces": { $gt: 0 } })
        .select("username stats role isBlocked createdAt")
        .sort({ "stats.bestWpm": -1 })
        .limit(10);

      // WPM distribution
      const wpmDistribution = await User.aggregate([
        { $match: { "stats.totalRaces": { $gt: 0 } } },
        {
          $bucket: {
            groupBy: "$stats.bestWpm",
            boundaries: [0, 30, 50, 70, 90, 110, 130, 150, 200, 300],
            default: "300+",
            output: { count: { $sum: 1 } },
          },
        },
      ]);

      return res.json({
        overview: {
          totalUsers,
          totalGuests,
          totalRegistered,
          blockedUsers,
          totalMatches,
          matchesToday,
          usersToday,
          avgWpm: avgStats[0]?.avgWpm ? Math.round(avgStats[0].avgWpm) : 0,
          avgAccuracy: avgStats[0]?.avgAccuracy
            ? Math.round(avgStats[0].avgAccuracy)
            : 0,
        },
        charts: {
          matchesPerDay,
          usersPerDay,
          wpmDistribution,
        },
        topPlayers,
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  },
);

// GET /admin/users - List all users with pagination
router.get(
  "/users",
  adminAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || "";
      const filter = (req.query.filter as string) || "all";

      const query: any = {};
      if (search) {
        query.username = { $regex: search, $options: "i" };
      }
      if (filter === "blocked") query.isBlocked = true;
      if (filter === "guests") query.isGuest = true;
      if (filter === "registered") query.isGuest = false;
      if (filter === "admins") query.role = "admin";

      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      return res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return res.status(500).json({ error: "Server error" });
    }
  },
);

// GET /admin/users/:id - Get specific user details
router.get(
  "/users/:id",
  adminAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const user = await User.findById(req.params.id).select("-password");
      if (!user) return res.status(404).json({ error: "User not found" });

      const matches = await Match.find({ "players.userId": req.params.id })
        .sort({ createdAt: -1 })
        .limit(20);

      const matchHistory = matches.map((match) => {
        const playerData = match.players.find(
          (p) => p.userId === req.params.id,
        );
        return {
          id: match._id,
          mode: match.mode,
          wpm: playerData?.wpm || 0,
          accuracy: playerData?.accuracy || 0,
          position: playerData?.position || 0,
          totalPlayers: match.players.length,
          date: match.createdAt,
        };
      });

      return res.json({ user, matchHistory });
    } catch (error) {
      return res.status(500).json({ error: "Server error" });
    }
  },
);

// POST /admin/users/:id/block - Block a user
router.post(
  "/users/:id/block",
  adminAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.role === "admin")
        return res.status(400).json({ error: "Cannot block an admin" });

      user.isBlocked = true;
      user.blockedAt = new Date();
      user.blockedReason = reason || "Violation of terms";
      await user.save();

      return res.json({
        success: true,
        message: `${user.username} has been blocked`,
      });
    } catch (error) {
      return res.status(500).json({ error: "Server error" });
    }
  },
);

// POST /admin/users/:id/unblock - Unblock a user
router.post(
  "/users/:id/unblock",
  adminAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      user.isBlocked = false;
      user.blockedAt = undefined;
      user.blockedReason = undefined;
      await user.save();

      return res.json({
        success: true,
        message: `${user.username} has been unblocked`,
      });
    } catch (error) {
      return res.status(500).json({ error: "Server error" });
    }
  },
);

// POST /admin/users/:id/make-admin - Promote to admin
router.post(
  "/users/:id/make-admin",
  adminAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      user.role = "admin";
      await user.save();

      return res.json({
        success: true,
        message: `${user.username} is now an admin`,
      });
    } catch (error) {
      return res.status(500).json({ error: "Server error" });
    }
  },
);

// POST /admin/users/:id/remove-admin - Demote from admin
router.post(
  "/users/:id/remove-admin",
  adminAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      if ((req as any).userId === req.params.id) {
        return res
          .status(400)
          .json({ error: "Cannot remove your own admin role" });
      }

      user.role = "user";
      await user.save();

      return res.json({
        success: true,
        message: `${user.username} admin role removed`,
      });
    } catch (error) {
      return res.status(500).json({ error: "Server error" });
    }
  },
);

// DELETE /admin/users/:id - Delete a user
router.delete(
  "/users/:id",
  adminAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.role === "admin")
        return res.status(400).json({ error: "Cannot delete an admin" });

      await User.findByIdAndDelete(req.params.id);
      return res.json({
        success: true,
        message: `${user.username} has been deleted`,
      });
    } catch (error) {
      return res.status(500).json({ error: "Server error" });
    }
  },
);

// GET /admin/matches - Recent matches
router.get(
  "/matches",
  adminAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const total = await Match.countDocuments();
      const matches = await Match.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      return res.json({
        matches,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return res.status(500).json({ error: "Server error" });
    }
  },
);

// GET /admin/analytics - Detailed analytics
router.get(
  "/analytics",
  adminAuth,
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      // Mode distribution
      const modeDistribution = await Match.aggregate([
        { $group: { _id: "$mode", count: { $sum: 1 } } },
      ]);

      // Average match duration
      const avgDuration = await Match.aggregate([
        { $addFields: { duration: { $subtract: ["$endedAt", "$startedAt"] } } },
        { $group: { _id: null, avgDuration: { $avg: "$duration" } } },
      ]);

      // Hourly activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const hourlyActivity = await Match.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);

      // Top WPM all time
      const topWpm = await User.find({ "stats.bestWpm": { $gt: 0 } })
        .select("username stats.bestWpm stats.avgWpm stats.totalRaces")
        .sort({ "stats.bestWpm": -1 })
        .limit(20);

      // Player retention (users who played in last 7 days vs total)
      const activeRecent = await Match.distinct("players.userId", {
        createdAt: { $gte: sevenDaysAgo },
      });

      return res.json({
        modeDistribution,
        avgDuration: avgDuration[0]?.avgDuration || 0,
        hourlyActivity,
        topWpm,
        activePlayersLast7Days: activeRecent.length,
      });
    } catch (error) {
      return res.status(500).json({ error: "Server error" });
    }
  },
);

export default router;
