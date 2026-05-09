import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { approveBoard, revokeBoard, getBoards } from "../controllers/boardController.js";

const router = express.Router();

// Only Supreme Authority can access these routes
router.use(protect);
router.use(restrictTo("supreme"));

// Approve/add a board
router.post("/", approveBoard);

// Revoke a board
router.post("/revoke", revokeBoard);

// Get all boards
router.get("/", getBoards);

export default router;
