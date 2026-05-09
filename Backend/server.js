import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

/* ROUTES */
import authRoutes from "./routes/auth.routes.js";
import supremeRoutes from "./routes/supreme.routes.js";
import boardRoutes from "./routes/board.routes.js";
import collegeRoutes from "./routes/college.routes.js";
import supremeBoardRoutes from "./routes/supremeBoard.routes.js";

const app = express();

/* =======================
   MIDDLEWARE
======================= */
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

/* =======================
   API ROUTES
======================= */
app.use("/auth", authRoutes);                  // login, JWT
app.use("/supreme", supremeRoutes);            // other supreme routes
app.use("/board", boardRoutes);                // board certificate approvals
app.use("/college", collegeRoutes);            // college operations

// Supreme Authority Board Management
app.use("/api/supreme-board", supremeBoardRoutes);

/* =======================
   HEALTH CHECK
======================= */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Blockchain Certificate Backend Running 🚀",
  });
});

/* =======================
   DATABASE + SERVER
======================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Backend running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
