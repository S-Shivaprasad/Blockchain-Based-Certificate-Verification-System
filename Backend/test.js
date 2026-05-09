import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

async function createBoard() {
  try {
    // 1️⃣ Connect DB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    // 2️⃣ Check if board already exists
    const exists = await User.findOne({ role: "board" });
    if (exists) {
      console.log("Board already exists");
      process.exit(0);
    }

    // 3️⃣ Hash password0xadfDcC46ef8A2e35cb84720A931b32645CAb95B7
    const hashedPassword = await bcrypt.hash("board123", 10);

    // 4️⃣ Create board user
    const board = await User.create({
      email: "board@admin.com",
      password: hashedPassword,
      role: "board",
      wallet: process.env.BOARD_WALLET
    });

    console.log("✅ Board created successfully");
    console.log({
      email: board.email,
      role: board.role,
      wallet: board.wallet
    });

    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating board:", err);
    process.exit(1);
  }
}

createBoard();
