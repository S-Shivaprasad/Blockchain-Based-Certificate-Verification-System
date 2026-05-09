import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import axios from "axios";
import * as XLSX from "xlsx";

import SupremeABI from "../../../../Blockchain/artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json";
import BoardABI from "../../../../Blockchain/artifacts/contracts/BoardAuthority.sol/BoardAuthority.json";
import IssuerABI from "../../../../Blockchain/artifacts/contracts/CertificateIssuer.sol/CertificateIssuer.json";
import StorageABI from "../../../../Blockchain/artifacts/contracts/CertificateStorage.sol/CertificateStorage.json";

import {
  SUPREME_AUTHORITY_ADDRESS,
  BOARD_AUTHORITY_ADDRESS,
  CERTIFICATE_STORAGE_ADDRESS,
  CERTIFICATE_ISSUER_ADDRESS,
} from "../../config/Contract";

const clean = (v) => v?.trim().replace(/^0x/, "0x");

export default function SubmitCertificate({ paused, onStats }) {
  const [mode, setMode] = useState("single");
  const [studentWallet, setStudentWallet] = useState("");
  const [studentName, setStudentName] = useState("");
  const [selectedDegree, setSelectedDegree] = useState("");
  const [file, setFile] = useState(null);
  const [degrees, setDegrees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [excelData, setExcelData] = useState([]);
  const [certificateFiles, setCertificateFiles] = useState({});
  const [progress, setProgress] = useState(0);
  const [sessionNonceOffset, setSessionNonceOffset] = useState(0);

  const fetchDegrees = useCallback(async () => {
  try {
    if (!window.ethereum) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const college = await signer.getAddress();

    const supreme = new ethers.Contract(
      SUPREME_AUTHORITY_ADDRESS,
      SupremeABI.abi,
      provider
    );

    const board = new ethers.Contract(
      BOARD_AUTHORITY_ADDRESS,
      BoardABI.abi,
      provider
    );

    const isPaused = await supreme.isSystemPaused();

    if (isPaused) {
      setDegrees([]);

      if (onStats) {
        onStats({ degreeCount: 0 });
      }

      return;
    }

    const boardAddr = await board.getCollegeBoard(college);

    if (boardAddr === ethers.ZeroAddress) {
      setDegrees([]);

      if (onStats) {
        onStats({ degreeCount: 0 });
      }

      return;
    }

    const allDegrees = await supreme.getAllDegrees();
    const allowed = [];

    for (let d of allDegrees) {
      const ok = await board.isCollegeAllowedForDegree(
        boardAddr,
        college,
        d.degreeId
      );

      if (ok) {
        allowed.push({
  degreeId: d.degreeId,
  name: d.name,
  level: Number(d.level)
});
      }
    }

    setDegrees(allowed);

    // SEND COUNT TO DASHBOARD
    if (onStats) {
      onStats({
        degreeCount: allowed.length
      });
    }

  } catch (err) {
    console.error(err);
  } finally {
    setFetching(false);
  }
}, [onStats]);

useEffect(() => {
  fetchDegrees();
}, [fetchDegrees]);

  const handleSingle = async () => {
    if (paused) return alert("System paused");

    if (!studentWallet || !selectedDegree || !file) {
      return alert("Fill all fields");
    }

    try {
      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const college = await signer.getAddress();

      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      const wallet = ethers.getAddress(studentWallet);
      const board = new ethers.Contract(BOARD_AUTHORITY_ADDRESS, BoardABI.abi, provider);
      const storage = new ethers.Contract(CERTIFICATE_STORAGE_ADDRESS, StorageABI.abi, provider);

      const boardAddr = await board.getCollegeBoard(college);
      // ✅ ADD HERE (Duplicate Check)
    const alreadyExists = await storage.hasCertificate(wallet, selectedDegree);
    if (alreadyExists) {
      alert("Certificate already exists for this student and degree.");
      setLoading(false);
      return;
    }

// ✅ ADD HERE
const selectedDegObj = degrees.find(d => d.degreeId === selectedDegree);
const reqLevel = selectedDegObj.level;
const currentMax = Number(await storage.studentMaxLevel(wallet));

if (reqLevel > 1 && currentMax < reqLevel - 1) {
  alert(`Constraint Error: Student missing Level ${reqLevel - 1} prerequisite.`);
  setLoading(false);
  return;
}
      const baseNonce = await storage.boardNonce(boardAddr);
      const currentNonce = Number(baseNonce) + sessionNonceOffset;

      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("btcnv_token");

      const upload = await axios.post("http://localhost:5000/college/upload-ipfs", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const cid = upload.data.cid;

      const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "address", "address", "address", "bytes32", "string", "uint256"],
        [chainId, CERTIFICATE_ISSUER_ADDRESS, boardAddr, wallet, college, selectedDegree, cid, currentNonce]
      );

      const hash = ethers.keccak256(encoded);
      const signature = await signer.signMessage(ethers.getBytes(hash));

      await axios.post(
        "http://localhost:5000/college/submit-certificate",
        {
          studentWallet: wallet,
          studentName,
          degreeId: selectedDegree,
          cid,
          nonce: currentNonce,
          collegeSignature: signature,
          boardAddress: boardAddr
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Certificate Submitted");
      if (onStats) {
  onStats(prev => ({
    submitted: (prev?.submitted || 0) + 1
  }));
}
      setSessionNonceOffset(prev => prev + 1);
      setStudentWallet("");
      setStudentName("");
      setFile(null);
    } catch (err) {
      alert(err?.response?.data?.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      const parsed = json
        .map((row) => {
          try {
            const wallet = ethers.getAddress(row["Student Wallet"]);
            return {
              studentWallet: wallet,
              studentName: row["Student Name"],
              fileName: row["File"]
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      setExcelData(parsed);
    };

    reader.readAsArrayBuffer(f);
  };

  const handleBatchFiles = (e) => {
    const files = Array.from(e.target.files);
    const map = {};
    files.forEach(f => { map[f.name] = f; });
    setCertificateFiles(map);
  };

  const handleBatch = async () => {
    if (paused) return alert("System paused");
    if (!excelData.length) return alert("Upload Excel first");

    try {
      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const college = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      const board = new ethers.Contract(BOARD_AUTHORITY_ADDRESS, BoardABI.abi, provider);
      const storage = new ethers.Contract(CERTIFICATE_STORAGE_ADDRESS, StorageABI.abi, provider);

      const boardAddr = await board.getCollegeBoard(college);
      const token = localStorage.getItem("btcnv_token");

      const baseNonce = await storage.boardNonce(boardAddr);
      let currentNonce = Number(baseNonce) + sessionNonceOffset;

      const processed = [];

      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        // ✅ Duplicate Check
const alreadyExists = await storage.hasCertificate(row.studentWallet, selectedDegree);
if (alreadyExists) {
  throw new Error(`Certificate already exists for ${row.studentWallet}`);
}


const selectedDegObj = degrees.find(d => d.degreeId === selectedDegree);
const reqLevel = selectedDegObj.level;
const currentMax = Number(await storage.studentMaxLevel(row.studentWallet));

if (reqLevel > 1 && currentMax < reqLevel - 1) {
  throw new Error(
    `Student ${row.studentWallet} missing Level ${reqLevel - 1} prerequisite`
  );
}
        const pdf = certificateFiles[row.fileName];

        const formData = new FormData();
        formData.append("file", pdf);

        const upload = await axios.post("http://localhost:5000/college/upload-ipfs", formData, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const cid = upload.data.cid;

        const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "address", "address", "address", "address", "bytes32", "string", "uint256"],
          [chainId, CERTIFICATE_ISSUER_ADDRESS, boardAddr, row.studentWallet, college, selectedDegree, cid, currentNonce]
        );

        const hash = ethers.keccak256(encoded);
        const signature = await signer.signMessage(ethers.getBytes(hash));

        processed.push({
          studentWallet: row.studentWallet,
          studentName: row.studentName,
          degreeId: selectedDegree,
          cid,
          nonce: currentNonce,
          collegeSignature: signature,
          boardAddress: boardAddr
        });

        currentNonce++;
        setProgress(Math.round(((i + 1) / excelData.length) * 100));
      }

      await axios.post(
        "http://localhost:5000/college/batch-submit",
        { certificates: processed },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Batch Submitted");
      if (onStats) {
  onStats(prev => ({
    submitted: (prev?.submitted || 0) + processed.length
  }));
}
      setSessionNonceOffset(currentNonce - Number(baseNonce));
      setExcelData([]);
      setCertificateFiles({});
      setProgress(0);
    } catch (err) {
      alert(err?.response?.data?.message || "Batch Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-6">
      <h2 className="text-xl font-semibold">Certificate Issuance</h2>
      <div className="flex gap-3">
        <button
          onClick={() => setMode("single")}
          className={mode === "single" ? "bg-white text-black px-4 py-2 rounded" : "px-4 py-2"}
        >
          Single
        </button>
        <button
          onClick={() => setMode("batch")}
          className={mode === "batch" ? "bg-white text-black px-4 py-2 rounded" : "px-4 py-2"}
        >
          Batch
        </button>
      </div>

      {mode === "single" && (
        <div className="space-y-4">
          <input
            placeholder="Student Wallet"
            value={studentWallet}
            onChange={(e) => setStudentWallet(e.target.value)}
            className="w-full p-3 rounded bg-white/10"
          />
          <input
            placeholder="Student Name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full p-3 rounded bg-white/10"
          />
          <select
            value={selectedDegree}
            onChange={(e) => setSelectedDegree(e.target.value)}
            className="w-full p-3 rounded bg-white/10"
          >
            <option value="">Select Degree</option>
            {degrees.map(d => (
              <option key={d.degreeId} value={d.degreeId}>
                {d.name}
              </option>
            ))}
          </select>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          <button
            onClick={handleSingle}
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded"
          >
            {loading ? "Processing..." : "Submit"}
          </button>
        </div>
      )}

      {mode === "batch" && (
        <div className="space-y-4">
          <select
            value={selectedDegree}
            onChange={(e) => setSelectedDegree(e.target.value)}
            className="w-full p-3 rounded bg-white/10"
          >
            <option value="">Select Degree</option>
            {degrees.map(d => (
              <option key={d.degreeId} value={d.degreeId}>
                {d.name}
              </option>
            ))}
          </select>
          <input type="file" accept=".xlsx" onChange={handleExcelUpload} />
          <input type="file" multiple onChange={handleBatchFiles} />
          {excelData.length > 0 && <p className="text-green-400">{excelData.length} students loaded</p>}
          {progress > 0 && (
            <div className="w-full bg-white/10 rounded">
              <div className="bg-green-400 h-2 rounded" style={{ width: `${progress}%` }} />
            </div>
          )}
          <button
            onClick={handleBatch}
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded"
          >
            {loading ? "Processing Batch..." : "Submit Batch"}
          </button>
        </div>
      )}
    </div>
  );
}