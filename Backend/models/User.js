import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String
  },
  role: {
    type: String,
    enum: ["supreme", "board", "hei", "student", "verifier"],
    required: true
  },
  wallet: {
  type: String,
  required: true
},

  // 🔥 Supreme → Board linkage
  boardName: String,       // "OU", "JNTUH"
  approvedBySupreme: {
    type: Boolean,
    default: false
  },

  // 🔥 Board → College linkage
  parentBoardEmail: String
});

export default mongoose.model("User", userSchema);
