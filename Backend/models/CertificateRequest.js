import mongoose from "mongoose";

const CertificateRequestSchema = new mongoose.Schema(
  {
    studentWallet: { type: String, required: true },
    studentName: { type: String, required: true },
    collegeWallet: { type: String, required: true },

    // ✅ ADD THIS FIELD
    boardAddress: { type: String, required: true },

    degreeId: { type: String, required: true },
    cid: { type: String, required: true },
    collegeSignature: { type: String, required: true },
    nonce: { type: Number, required: true },
    collegeEmail: { type: String },

    source: { 
      type: String, 
      enum: ["SINGLE", "BULK"], 
      default: "SINGLE" 
    },

    status: {
      type: String,
      enum: ["PENDING", "ISSUED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

export default mongoose.model("CertificateRequest", CertificateRequestSchema);