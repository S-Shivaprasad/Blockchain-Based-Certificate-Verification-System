// pinataUpload.cjs
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

const app = express();
const upload = multer({ dest: "uploads/" });

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;

app.post("/api/pin-certificate", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileStream = fs.createReadStream(filePath);

    const formData = new FormData();
    formData.append("file", fileStream);

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        maxBodyLength: "Infinity",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_API_SECRET,
        },
      }
    );

    fs.unlinkSync(filePath);
    res.json({ cid: response.data.IpfsHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload file to Pinata" });
  }
});

app.listen(4000, () => console.log("Pinata backend running on http://localhost:4000"));
