import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const createSupreme = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = "supreme@edu.gov";
    const plainPassword = "board123"; // 👈 choose your password

    const existing = await User.findOne({ email });
    if (existing) {
      console.log("Supreme already exists");
      process.exit(0);
    }

    const hash = await bcrypt.hash(plainPassword, 10);

    await User.create({
      email,
      password: hash,
      role: "supreme",
    });

    console.log("✅ Supreme user created");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createSupreme();
