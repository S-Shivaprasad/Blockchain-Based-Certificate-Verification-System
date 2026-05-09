import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Board from "../models/Board.js";
import { ethers } from "ethers";
//import SupremeABI from "../../Blockchain/artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json";

const router = express.Router();

/* =======================
   SUPREME LOGIN
======================= */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (
    email !== process.env.SUPREME_EMAIL ||
    password !== process.env.SUPREME_PASSWORD
  ) {
    return res.status(401).json({ message: "Invalid Supreme credentials" });
  }

  const token = jwt.sign(
    { role: "supreme" },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
});

/* =======================
   APPROVE BOARD
======================= */
router.post("/approve-board", async (req, res) => {
  try {
    const { boardId } = req.body;

    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // 🔗 Blockchain call
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.SUPREME_PRIVATE_KEY, provider);

    const supremeContract = new ethers.Contract(
      process.env.SUPREME_AUTHORITY_ADDRESS,
      SupremeABI.abi,
      wallet
    );

    const tx = await supremeContract.approveBoard(board.wallet);
    await tx.wait();

    board.approved = true;
    board.approvedAt = new Date();
    await board.save();

    res.json({
      message: "Board approved successfully",
      board
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

/* =======================
   LIST BOARDS
======================= */
router.get("/boards", async (req, res) => {
  const boards = await Board.find();
  res.json(boards);
});

export default router;
