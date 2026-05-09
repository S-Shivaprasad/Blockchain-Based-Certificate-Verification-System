import mongoose from "mongoose";

const boardSchema = new mongoose.Schema({
  name: { type: String, required: true },                 // Board Name (OU, JNTUH, etc.)
  wallet: { type: String, required: true, unique: true }, // Wallet Address
  status: { type: String, enum: ["approved", "revoked"], default: "approved" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Board", boardSchema);
