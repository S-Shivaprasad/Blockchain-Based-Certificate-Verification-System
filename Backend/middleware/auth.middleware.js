import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* ================= PROTECT ================= */
export const protect = async (req, res, next) => {
  try {
    console.log("\n====== AUTH DEBUG START ======");

    const authHeader = req.headers.authorization;
    console.log("AUTH HEADER:", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No Bearer token");
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    console.log("TOKEN:", token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("DECODED:", decoded);

    /* SUPREME USER */
    if (decoded.role === "supreme") {
      console.log("✅ Supreme user detected");
      req.user = {
        _id: "supreme-admin",
        role: "supreme",
        wallet: null,
        email: process.env.SUPREME_EMAIL
      };
      return next();
    }

    if (!decoded.id) {
      console.log("❌ Missing ID in token");
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const user = await User.findById(decoded.id);
    console.log("DB USER:", user);

    if (!user) {
      console.log("❌ User not found in DB");
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      _id: user._id,
      email: user.email,
      role: user.role,
      wallet: user.wallet || decoded.wallet
    };

    console.log("FINAL USER:", req.user);
    console.log("====== AUTH DEBUG END ======\n");

    next();

  } catch (err) {
    console.error("🔥 AUTH ERROR:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
/* ================= ROLE CHECK ================= */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};