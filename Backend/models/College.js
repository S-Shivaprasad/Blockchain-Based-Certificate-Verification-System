import mongoose from "mongoose";

const collegeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    wallet: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true
    },

    email: { 
      type: String, 
      required: true, 
      unique: true 
    },

    boardAddress: { 
      type: String, 
      required: true 
    },

    status: { 
      type: String, 
      enum: ["approved", "revoked"], 
      default: "approved" 
    },

    role: {
      type: String,
      default: "hei"
    }
  },
  { timestamps: true }
);

export default mongoose.model("College", collegeSchema);