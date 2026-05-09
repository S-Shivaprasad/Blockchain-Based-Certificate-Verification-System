import express from "express";
import multer from "multer";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { ethers } from "ethers";

import Certificate from "../models/CertificateRequest.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

import StorageABI from "../../Blockchain/artifacts/contracts/CertificateStorage.sol/CertificateStorage.json" with { type: "json" };
import IssuerABI from "../../Blockchain/artifacts/contracts/CertificateIssuer.sol/CertificateIssuer.json" with { type: "json" };

const router = express.Router();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

const storageContract = new ethers.Contract(
  process.env.CERTIFICATE_STORAGE_ADDRESS,
  StorageABI.abi,
  provider
);

const issuer = new ethers.Contract(
  process.env.CERTIFICATE_ISSUER_ADDRESS,
  IssuerABI.abi,
  provider
);

const clean = (v) => v?.trim().toLowerCase();

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF allowed"));
    } else {
      cb(null, true);
    }
  }
});

router.post(
  "/upload-ipfs",
  protect,
  restrictTo("hei"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const formData = new FormData();
      formData.append("file", fs.createReadStream(req.file.path));

      const pinataRes = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          maxBodyLength: Infinity,
          headers: {
            ...formData.getHeaders(),
            pinata_api_key: process.env.PINATA_API_KEY,
            pinata_secret_api_key: process.env.PINATA_API_SECRET,
          },
        }
      );

      fs.unlinkSync(req.file.path);

      res.json({
        message: "Uploaded to IPFS",
        cid: pinataRes.data.IpfsHash,
      });
    } catch (err) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: "IPFS Upload Failed" });
    }
  }
);

router.post(
  "/batch-submit",
  protect,
  restrictTo("hei"),
  async (req, res) => {
    try {
      const { certificates } = req.body;

      if (!certificates || !Array.isArray(certificates)) {
        return res.status(400).json({ message: "Invalid batch data" });
      }

      const collegeWallet = req.user.wallet;
      const savedCertificates = [];

      for (const cert of certificates) {
        const {
          studentWallet,
          studentName,
          degreeId,
          cid,
          collegeSignature,
          nonce,
          boardAddress
        } = cert;

        const degreeBytes = degreeId.startsWith("0x") ? degreeId : ethers.id(degreeId);

        const digest = await issuer.getDigest(
          boardAddress,
          studentWallet,
          collegeWallet,
          degreeBytes,
          cid,
          nonce
        );

        let recovered;
        try {
          recovered = ethers.recoverAddress(digest, collegeSignature);
        } catch (err) {
          continue;
        }

        if (clean(recovered) !== clean(collegeWallet)) {
          continue;
        }

        const certificate = await Certificate.create({
          studentWallet,
          studentName,
          collegeWallet,
          boardAddress,
          degreeId,
          cid,
          nonce,
          collegeSignature,
          collegeEmail: req.user.email,
          status: "PENDING"
        });

        savedCertificates.push(certificate);
      }

      res.status(201).json({
        message: "Batch submitted successfully",
        count: savedCertificates.length
      });
    } catch (err) {
      res.status(500).json({ message: "Batch submit failed" });
    }
  }
);
router.get(
  "/submitted",
  protect,
  restrictTo("hei"),
  async (req, res) => {
    try {
      const collegeWallet = req.user.wallet;

      const certificates = await Certificate.find({
        collegeWallet
      })
      .sort({ createdAt: -1 })
      .select(
        "studentName studentWallet cid status createdAt"
      );

      res.json({
        certificates
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Failed to fetch submitted certificates"
      });
    }
  }
);

router.post(
  "/submit-certificate",
  protect,
  restrictTo("hei"),
  async (req, res) => {
    try {
      const {
        studentWallet,
        studentName,
        degreeId,
        cid,
        collegeSignature,
        boardAddress,
        nonce
      } = req.body;

      const collegeWallet = req.user.wallet;
      const degreeBytes = degreeId.startsWith("0x") ? degreeId : ethers.id(degreeId);

      const digest = await issuer.getDigest(
        boardAddress,
        studentWallet,
        collegeWallet,
        degreeBytes,
        cid,
        nonce
      );

      let recovered;
      try {
        recovered = ethers.recoverAddress(digest, collegeSignature);
      } catch {
        return res.status(400).json({ message: "Invalid signature format" });
      }

      if (clean(recovered) !== clean(collegeWallet)) {
        return res.status(401).json({ message: "Invalid Signature" });
      }

      const certificate = await Certificate.create({
        studentWallet,
        studentName,
        collegeWallet,
        boardAddress,
        degreeId,
        cid,
        nonce: Number(nonce),
        collegeSignature,
        collegeEmail: req.user.email,
        status: "PENDING"
      });

      res.status(201).json({
        message: "Certificate Submitted Successfully",
        certificate
      });
    } catch (err) {
      res.status(500).json({ message: "Server Error" });
    }
  }
);

export default router;