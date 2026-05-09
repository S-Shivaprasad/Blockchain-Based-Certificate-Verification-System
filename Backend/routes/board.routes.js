import express from "express";
import { ethers } from "ethers";

import Certificate from "../models/CertificateRequest.js";
import College from "../models/College.js";

import { protect, restrictTo } from "../middleware/auth.middleware.js";

import IssuerABI from "../../Blockchain/artifacts/contracts/CertificateIssuer.sol/CertificateIssuer.json" with { type: "json" };

const router = express.Router();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

const issuer = new ethers.Contract(
  process.env.CERTIFICATE_ISSUER_ADDRESS,
  IssuerABI.abi,
  provider
);

const clean = (v) => v?.trim().toLowerCase();

router.get(
  "/pending-certificates",
  protect,
  restrictTo("board"),
  async (req, res) => {
    try {
      const boardWallet = req.user.wallet;

      const requests = await Certificate.find({
        status: "PENDING"
      }).sort({ createdAt: -1 });

      const verified = [];

      for (const cert of requests) {
        if (clean(cert.boardAddress) !== clean(boardWallet)) {
          continue;
        }

        const degreeBytes = cert.degreeId?.startsWith("0x")
          ? cert.degreeId
          : ethers.id(cert.degreeId);

        const digest = await issuer.getDigest(
          cert.boardAddress,
          cert.studentWallet,
          cert.collegeWallet,
          degreeBytes,
          cert.cid,
          cert.nonce
        );

        let recovered;

        try {
          recovered = ethers.recoverAddress(digest, cert.collegeSignature);
        } catch (err) {
          continue;
        }

        if (clean(recovered) !== clean(cert.collegeWallet)) {
          continue;
        }

        verified.push(cert);
      }

      res.json({
        requests: verified
      });
    } catch (err) {
      res.status(500).json({
        message: "Failed to fetch"
      });
    }
  }
);

router.post(
  "/mark-issued/:id",
  protect,
  restrictTo("board"),
  async (req, res) => {
    try {
      const certificate = await Certificate.findById(req.params.id);

      if (!certificate) {
        return res.status(404).json({
          message: "Not found"
        });
      }

      certificate.status = "ISSUED";
      await certificate.save();

      res.json({
        message: "Updated"
      });
    } catch (err) {
      res.status(500).json({
        message: "Failed"
      });
    }
  }
);

router.get(
  "/colleges",
  protect,
  restrictTo("board"),
  async (req, res) => {
    try {
      const colleges = await College.find();
      res.json(colleges);
    } catch (err) {
      res.status(500).json({
        message: "Failed"
      });
    }
  }
);

router.post(
  "/colleges",
  protect,
  restrictTo("board"),
  async (req, res) => {
    try {
      const { name, wallet } = req.body;

      const existing = await College.findOne({
        wallet: wallet.toLowerCase()
      });

      if (existing) {
        existing.status = "approved";
        existing.name = name;
        await existing.save();

        return res.json({
          message: "Re-approved",
          college: existing
        });
      }

      const college = await College.create({
        name,
        wallet: wallet.toLowerCase(),
        status: "approved"
      });

      res.json({
        message: "Approved",
        college
      });
    } catch (err) {
      res.status(500).json({
        message: "Failed"
      });
    }
  }
);

router.post(
  "/colleges/revoke",
  protect,
  restrictTo("board"),
  async (req, res) => {
    try {
      const { wallet } = req.body;

      const college = await College.findOne({
        wallet: wallet.toLowerCase()
      });

      if (!college) {
        return res.status(404).json({
          message: "Not found"
        });
      }

      college.status = "revoked";
      await college.save();

      res.json({
        message: "Revoked"
      });
    } catch (err) {
      res.status(500).json({
        message: "Failed"
      });
    }
  }
);

export default router;