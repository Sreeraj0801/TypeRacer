import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";

const router = Router();

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  return secret;
}

function generateToken(userId: string, username: string): string {
  return jwt.sign({ userId, username }, getJwtSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as any,
  } as any);
}

// Register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    if (username.length < 3 || username.length > 20) {
      return res
        .status(400)
        .json({ error: "Username must be 3-20 characters" });
    }

    if (password.length < 4) {
      return res
        .status(400)
        .json({ error: "Password must be at least 4 characters" });
    }

    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    });
    if (existingUser) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.toLowerCase(),
      password: hashedPassword,
      isGuest: false,
    });

    const token = generateToken(user._id.toString(), user.username);
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        isGuest: false,
        role: user.role || "user",
        stats: user.stats,
        preferences: user.preferences,
      },
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Username already taken" });
    }
    return res.status(500).json({ error: "Server error" });
  }
});

// Login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.isBlocked) {
      return res
        .status(403)
        .json({
          error:
            "Your account has been blocked. Reason: " +
            (user.blockedReason || "Violation of terms"),
        });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user._id.toString(), user.username);
    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        isGuest: user.isGuest,
        role: user.role || "user",
        stats: user.stats,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

// Guest login (creates a guest account with unique username)
router.post("/guest", async (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    if (username.length < 3 || username.length > 20) {
      return res
        .status(400)
        .json({ error: "Username must be 3-20 characters" });
    }

    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    });
    if (existingUser) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const randomPass =
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    const hashedPassword = await bcrypt.hash(randomPass, 10);

    const user = await User.create({
      username: username.toLowerCase(),
      password: hashedPassword,
      isGuest: true,
    });

    const token = generateToken(user._id.toString(), user.username);
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        isGuest: true,
        stats: user.stats,
        preferences: user.preferences,
      },
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Username already taken" });
    }
    return res.status(500).json({ error: "Server error" });
  }
});

// Get current user profile
router.get("/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, getJwtSecret()) as {
      userId: string;
      username: string;
    };

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      id: user._id,
      username: user.username,
      isGuest: user.isGuest,
      role: user.role || "user",
      stats: user.stats,
      preferences: user.preferences,
      createdAt: user.createdAt,
    });
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

// Update preferences
router.put("/preferences", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };

    const { theme, cursorStyle, cursorColor } = req.body;
    const update: any = {};
    if (theme && ["dark", "light"].includes(theme)) {
      update["preferences.theme"] = theme;
    }
    if (
      cursorStyle &&
      ["line", "block", "underline", "pulse"].includes(cursorStyle)
    ) {
      update["preferences.cursorStyle"] = cursorStyle;
    }
    if (cursorColor && /^#[0-9a-fA-F]{6}$/.test(cursorColor)) {
      update["preferences.cursorColor"] = cursorColor;
    }

    const user = await User.findByIdAndUpdate(decoded.userId, update, {
      new: true,
    }).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ preferences: user.preferences });
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

// Update password
router.put("/password", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both passwords required" });
    }
    if (newPassword.length < 4) {
      return res
        .status(400)
        .json({ error: "New password must be at least 4 characters" });
    }

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid)
      return res.status(401).json({ error: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ success: true, message: "Password updated" });
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
