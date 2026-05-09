import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

/* =========================
   SIGNUP ROUTE
========================= */
router.post("/signup", async (req, res) => {
  try {
    const { email, password, wallet, role } = req.body;

    if (!email || !password || !wallet || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const allowedRoles = ["board", "hei", "student", "verifier"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      wallet,
      role,
    });

    await user.save();

    // 🔥 INCLUDE id
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        wallet: user.wallet
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, role: user.role });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   LOGIN ROUTE
========================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password, wallet } = req.body;

    /* ===== SUPREME LOGIN ===== */
    if (email === process.env.SUPREME_EMAIL) {

      const isSupreme = await bcrypt.compare(
        password,
        process.env.SUPREME_PASSWORD
      );

      if (!isSupreme) {
        return res.status(401).json({ message: "Invalid supreme password" });
      }

      const token = jwt.sign(
        {
          id: "supreme-admin",
          role: "supreme"
        },
        process.env.JWT_SECRET,
        { expiresIn: "12h" }
      );

      return res.json({ token, role: "supreme" });
    }

    /* ===== REGULAR USERS ===== */

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid user" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    /* 🔐 WALLET CHECK */

    if (!wallet) {
      return res.status(400).json({
        message: "Wallet connection required"
      });
    }

    if (user.wallet.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(403).json({
        message: "Wallet mismatch. Access denied."
      });
    }

    /* ===== LOGIN SUCCESS ===== */

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        wallet: user.wallet
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, role: user.role });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;