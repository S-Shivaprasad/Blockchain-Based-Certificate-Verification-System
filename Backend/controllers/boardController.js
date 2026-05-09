import Board from "../models/Board.js";

// Approve or add a board
export const approveBoard = async (req, res) => {
  try {
    const { name, wallet, status } = req.body;

    if (!name || !wallet) {
      return res.status(400).json({ message: "Name and Wallet are required" });
    }

    // Upsert: create if not exists, update if exists
    const board = await Board.findOneAndUpdate(
      { wallet },
      { name, status: status || "approved" },
      { new: true, upsert: true }
    );

    res.json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Revoke a board
export const revokeBoard = async (req, res) => {
  try {
    const { wallet } = req.body;

    if (!wallet) {
      return res.status(400).json({ message: "Wallet is required" });
    }

    const board = await Board.findOneAndUpdate(
      { wallet },
      { status: "revoked" },
      { new: true }
    );

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    res.json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all boards
export const getBoards = async (req, res) => {
  try {
    const boards = await Board.find().sort({ createdAt: -1 });
    res.json(boards); // Always returns an array
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
