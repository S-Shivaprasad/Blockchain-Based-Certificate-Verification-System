import * as XLSX from "xlsx";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

import SupremeABI from "../../../../Blockchain/artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json";
import CollegeRegistryABI from "../../../../Blockchain/artifacts/contracts/CollegeRegistry.sol/CollegeRegistry.json";
import BoardABI from "../../../../Blockchain/artifacts/contracts/BoardAuthority.sol/BoardAuthority.json";

import {
  SUPREME_AUTHORITY_ADDRESS,
  COLLEGE_REGISTRY_ADDRESS,
  BOARD_AUTHORITY_ADDRESS,
} from "../../config/Contract";

const clean = (v) => v?.trim();

export default function ApproveColleges() {
  const [collegeWallet, setCollegeWallet] = useState("");
  const [collegeName, setCollegeName] = useState("");

  const [batchWallets, setBatchWallets] = useState("");
  const [batchNames, setBatchNames] = useState("");

  const [boardDegrees, setBoardDegrees] = useState([]);
  const [selectedDegrees, setSelectedDegrees] = useState([]);

  const [approvedColleges, setApprovedColleges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [excelData, setExcelData] = useState([]);

  /* ================= LOAD ================= */
  useEffect(() => {
    loadBoardData();
  }, []);

  const loadBoardData = async () => {
    try {
      if (!window.ethereum) {
        alert("Install MetaMask");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const boardAddress = clean(await signer.getAddress());

      console.log("Connected Board:", boardAddress);

      const supreme = new ethers.Contract(
        clean(SUPREME_AUTHORITY_ADDRESS),
        SupremeABI.abi,
        provider
      );

      const registry = new ethers.Contract(
        clean(COLLEGE_REGISTRY_ADDRESS),
        CollegeRegistryABI.abi,
        provider
      );

      

      /* ===== Degrees ===== */
      const degrees = await supreme.getAllDegrees();
      const allowed = [];

      for (const d of degrees) {
        const ok = await supreme.canBoardUseDegree(
          boardAddress,
          d.degreeId
        );

        if (ok) {
          allowed.push({
            degreeId: d.degreeId.toString(),
            name: d.name,
          });
        }
      }

      setBoardDegrees(allowed);

      /* ===== Colleges ===== */
      const myColleges = await registry.getBoardColleges(boardAddress);
      setApprovedColleges(myColleges);

    } catch (err) {
      console.error("LOAD ERROR:", err);
    }
  };

  /* ================= TOGGLE ================= */
  const toggleDegree = (deg) => {
    const exists = selectedDegrees.find(
      (d) => d.degreeId === deg.degreeId
    );

    if (exists) {
      setSelectedDegrees(
        selectedDegrees.filter((d) => d.degreeId !== deg.degreeId)
      );
    } else {
      setSelectedDegrees([...selectedDegrees, deg]);
    }
  };

  /* ================= SINGLE APPROVE ================= */
  const approveCollege = async () => {
  const wallet = clean(collegeWallet);

  if (!ethers.isAddress(wallet))
    return alert("Invalid wallet address");

  if (!collegeName)
    return alert("Enter college name");

  if (selectedDegrees.length === 0)
    return alert("Select at least one degree");

  try {
    setLoading(true);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const boardAddress = await signer.getAddress();

    const supreme = new ethers.Contract(
      clean(SUPREME_AUTHORITY_ADDRESS),
      SupremeABI.abi,
      provider
    );

    const registry = new ethers.Contract(
      clean(COLLEGE_REGISTRY_ADDRESS),
      CollegeRegistryABI.abi,
      signer
    );

    const board = new ethers.Contract(
      clean(BOARD_AUTHORITY_ADDRESS),
      BoardABI.abi,
      signer
    );

    console.log("Board:", boardAddress);
    console.log("College:", wallet);

    /* ================= REGISTER ================= */
    const isRegistered = await registry.isRegisteredCollege(wallet);

    if (!isRegistered) {
      const code = "CLG-" + wallet.slice(2, 6).toUpperCase();

      console.log("Registering college...");

      const tx1 = await registry.registerCollege(
        wallet,
        collegeName,
        code,
        ""
      );
      await tx1.wait();
    }

    /* ================= APPROVE ================= */
    console.log("Approving college...");

    const tx2 = await board.approveCollege(wallet);
    await tx2.wait();

    /* ================= ASSIGN DEGREES ================= */
    const degreeIds = selectedDegrees.map((d) => d.degreeId);

    console.log("Assigning degrees:", degreeIds);

    const tx3 = await board.allowCollegeDegrees(wallet, degreeIds);
    await tx3.wait();

    /* ================= VERIFY (🔥 CRITICAL) ================= */
    console.log("Verifying permissions...");

    let failed = [];

    for (const deg of degreeIds) {
  const allowed = await board.isCollegeAllowedForDegree(
    boardAddress,   // 👈 REQUIRED
    wallet,         // college
    deg             // degreeId
  );

  if (!allowed) {
    failed.push(deg);
  }
}

    if (failed.length > 0) {
      console.warn("Retrying failed degrees:", failed);

      const retryTx = await board.allowCollegeDegrees(wallet, failed);
      await retryTx.wait();
    }

    alert("✅ College Approved + Degrees Linked Successfully");

    setCollegeWallet("");
    setCollegeName("");
    setSelectedDegrees([]);

    loadBoardData();

  } catch (err) {
    console.error("APPROVE ERROR:", err);

    alert(
      err?.reason ||
      err?.shortMessage ||
      err?.message ||
      "Transaction Failed"
    );
  } finally {
    setLoading(false);
  }
};

/* ================= EXCEL UPLOAD ================= */

const handleExcelUpload = (e) => {

  const file = e.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = (evt) => {

    const data = new Uint8Array(evt.target.result);

    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheetName];

    const json = XLSX.utils.sheet_to_json(worksheet);

    const parsed = json.map((row) => ({
      name: clean(row["College Name"]),
      wallet: clean(row["Wallet"]),
    }));

    setExcelData(parsed);

    console.log("Parsed Excel:", parsed);
  };

  reader.readAsArrayBuffer(file);

};
  /* ================= BATCH APPROVE ================= */

  const batchApprove = async () => {

  if (excelData.length === 0)
    return alert("Upload Excel file first");

  if (selectedDegrees.length === 0)
    return alert("Select degrees");

  try {

    setLoading(true);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const registry = new ethers.Contract(
      clean(COLLEGE_REGISTRY_ADDRESS),
      CollegeRegistryABI.abi,
      signer
    );

    const board = new ethers.Contract(
      clean(BOARD_AUTHORITY_ADDRESS),
      BoardABI.abi,
      signer
    );

    const degreeIds = selectedDegrees.map((d) => d.degreeId);

    for (const row of excelData) {

      const wallet = row.wallet;
      const name = row.name;

      if (!ethers.isAddress(wallet)) {
        console.warn("Invalid wallet:", wallet);
        continue;
      }

      const isRegistered = await registry.isRegisteredCollege(wallet);

      if (!isRegistered) {

        const code = "CLG-" + wallet.slice(2, 6).toUpperCase();

        const tx1 = await registry.registerCollege(
          wallet,
          name,
          code,
          ""
        );

        await tx1.wait();

      }

      const tx2 = await board.approveCollege(wallet);
      await tx2.wait();

      if (degreeIds.length > 0) {

        const tx3 = await board.allowCollegeDegrees(
          wallet,
          degreeIds
        );

        await tx3.wait();

      }

    }

    alert("🚀 Excel Batch Approval Completed");

    setExcelData([]);

    loadBoardData();

  } catch (err) {

    console.error(err);

    alert(
      err?.reason ||
      err?.shortMessage ||
      err?.message ||
      "Batch Failed"
    );

  } finally {

    setLoading(false);

  }

};

  /* ================= UI ================= */
  return (
    <div className="space-y-8">

      <h2 className="text-2xl text-white font-bold">
        🎓 College Approval Panel
      </h2>

      {/* DEGREE SELECT */}
      <div className="bg-blue-500/10 p-4 rounded-xl">
        <h4 className="text-white font-bold mb-2">
          Select Degrees
        </h4>

        <div className="flex flex-wrap gap-2">
          {boardDegrees.map((deg) => (
            <button
              key={deg.degreeId}
              onClick={() => toggleDegree(deg)}
              className={`px-3 py-1 rounded ${
                selectedDegrees.find(
                  (d) => d.degreeId === deg.degreeId
                )
                  ? "bg-blue-500"
                  : "bg-gray-700"
              }`}
            >
              {deg.name}
            </button>
          ))}
        </div>
      </div>

      {/* SINGLE APPROVAL */}
      <div className="bg-white/10 p-6 rounded-xl space-y-4">
        <input
          value={collegeName}
          onChange={(e) => setCollegeName(e.target.value)}
          placeholder="College Name"
          className="w-full p-3 rounded bg-gray-800 text-white"
        />

        <input
          value={collegeWallet}
          onChange={(e) => setCollegeWallet(e.target.value)}
          placeholder="Wallet Address"
          className="w-full p-3 rounded bg-gray-800 text-white"
        />

        <button
          onClick={approveCollege}
          disabled={loading}
          className="w-full bg-blue-600 py-3 rounded"
        >
          {loading ? "Processing..." : "Approve College"}
        </button>
      </div>

      {/* BATCH APPROVAL */}
     <div className="bg-purple-500/10 p-6 rounded-xl space-y-4">

  <h4 className="text-white font-bold">
    Upload Excel File
  </h4>

  <input
    type="file"
    accept=".xlsx, .xls"
    onChange={handleExcelUpload}
    className="text-white"
  />

  {excelData.length > 0 && (
    <p className="text-green-400 text-sm">
      {excelData.length} colleges loaded from Excel
    </p>
  )}

  <button
    onClick={batchApprove}
    disabled={loading}
    className="w-full bg-purple-600 py-3 rounded"
  >
    {loading ? "Processing..." : "Batch Approve 🚀"}
  </button>

</div>

      

    </div>
  );
}