import { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { FaSync, FaCopy } from "react-icons/fa";

import SupremeABI from "../../../../Blockchain/artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json";
import StorageABI from "../../../../Blockchain/artifacts/contracts/CertificateStorage.sol/CertificateStorage.json";
import BoardABI from "../../../../Blockchain/artifacts/contracts/BoardAuthority.sol/BoardAuthority.json";
import IssuerABI from "../../../../Blockchain/artifacts/contracts/CertificateIssuer.sol/CertificateIssuer.json";

import {
  SUPREME_AUTHORITY_ADDRESS,
  CERTIFICATE_STORAGE_ADDRESS,
  CERTIFICATE_ISSUER_ADDRESS,
  BOARD_AUTHORITY_ADDRESS,
} from "../../config/Contract";

const clean = (v) => v?.trim().toLowerCase();

export default function IssueCertificate() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [paused, setPaused] = useState(false);
  const [isBoardApproved, setIsBoardApproved] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        if (!window.ethereum) return;
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const boardAddress = await signer.getAddress();
        const supreme = new ethers.Contract(SUPREME_AUTHORITY_ADDRESS, SupremeABI.abi, provider);
        const approved = await supreme.isApprovedBoard(boardAddress);
        
        setIsBoardApproved(approved);
        const pausedState = await supreme.isSystemPaused();
        setPaused(pausedState);
      } catch (err) {
        console.error("Init Error:", err);
      }
    };
    init();
  }, []);

  const fetchPending = async () => {
    try {
      setFetching(true);
      const token = localStorage.getItem("btcnv_token");
      const res = await axios.get("http://localhost:5000/board/pending-certificates", {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("========== FETCHED REQUESTS ==========");
(res.data.requests || []).forEach(r=>{
  console.log("STUDENT:", r.studentWallet);
  console.log("COLLEGE:", r.collegeWallet);
  console.log("BOARD:", r.boardAddress);
  console.log("NONCE:", r.nonce);
  console.log("--------------------------------");
});
      setPendingRequests(res.data.requests || []);
    } catch (err) {
      console.error("Fetch Pending Error:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (isBoardApproved) fetchPending();
  }, [isBoardApproved]);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const approveBatch = async () => {
    try {
      if (paused) return alert("System paused");

      const selectedRequests = pendingRequests
        .filter(r => selected.includes(r._id))
        .sort((a, b) => a.nonce - b.nonce);

      if (!selectedRequests.length) return alert("Select requests first");

      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const boardAddress = await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      const storage = new ethers.Contract(CERTIFICATE_STORAGE_ADDRESS, StorageABI.abi, provider);
      const issuer = new ethers.Contract(CERTIFICATE_ISSUER_ADDRESS, IssuerABI.abi, signer);

      let currentOnChainNonce = Number(await storage.boardNonce(boardAddress));
      console.log("========== BOARD APPROVAL START ==========");
console.log("BOARD ADDRESS:", boardAddress);
console.log("ONCHAIN NONCE:", currentOnChainNonce);
console.log("SELECTED COUNT:", selectedRequests.length);

      const students = [];
      const colleges = [];
      const degreeIds = [];
      const cids = [];
      const boardSignatures = [];
      const collegeSignatures = [];
      const token = localStorage.getItem("btcnv_token");

      for (const req of selectedRequests) {
        console.log("\n============= PROCESSING =============");
console.log("STUDENT:", req.studentWallet);
console.log("COLLEGE:", req.collegeWallet);
console.log("DB NONCE:", req.nonce);
console.log("EXPECTED NONCE:", currentOnChainNonce);
        if (Number(req.nonce) !== currentOnChainNonce) {
          alert(`Nonce mismatch for ${req.studentWallet}. Expected ${currentOnChainNonce}, got ${req.nonce}`);
          setLoading(false);
          return;
        }

        const student = clean(req.studentWallet);
        const college = clean(req.collegeWallet);
        const degreeIdBytes = req.degreeId.startsWith("0x") ? req.degreeId : ethers.id(req.degreeId);

        const digest = await issuer.getDigest(
          boardAddress,
          student,
          college,
          degreeIdBytes,
          req.cid,
          currentOnChainNonce
        );
        console.log("DIGEST:", digest);
console.log("COLLEGE SIGNATURE:", req.collegeSignature);

        let recoveredCollege;
        try {
          recoveredCollege = ethers.recoverAddress(digest, req.collegeSignature.trim());
          if (clean(recoveredCollege) !== clean(college)) {
            alert(`Invalid College Signature for ${student}`);
            setLoading(false);
            return;
          }
        } catch (err) {
          alert(`Invalid signature format for ${student}`);
          setLoading(false);
          return;
        }
        console.log("RECOVERED COLLEGE:", recoveredCollege);
console.log("EXPECTED COLLEGE:", college);

        const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "address", "address", "address", "address", "bytes32", "string", "uint256"],
          [chainId, CERTIFICATE_ISSUER_ADDRESS, boardAddress, student, college, degreeIdBytes, req.cid, currentOnChainNonce]
        );

        const rawHash = ethers.keccak256(encoded);
        const boardSignature = await signer.signMessage(ethers.getBytes(rawHash));
        console.log("BOARD SIGNATURE:", boardSignature);
console.log("NONCE USED:", currentOnChainNonce);

        students.push(student);
        colleges.push(college);
        degreeIds.push(degreeIdBytes);
        cids.push(req.cid);
        boardSignatures.push(boardSignature);
        collegeSignatures.push(req.collegeSignature.trim());

        currentOnChainNonce++;
      }

      const tx = await issuer.batchIssueCertificates(
        students,
        colleges,
        degreeIds,
        cids,
        boardSignatures,
        collegeSignatures
      );

      await tx.wait();

      for (const req of selectedRequests) {
        await axios.post(`http://localhost:5000/board/mark-issued/${req._id}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      alert(`${students.length} certificates issued`);
      setSelected([]);
      fetchPending();
    } catch (err) {
      console.error("Batch Approval Error:", err);
      alert("Batch failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isBoardApproved) return <div className="p-6 bg-red-600 text-white rounded-xl">Wallet not approved as Board</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold text-emerald-400">Certificate Approvals</h2>
        <button onClick={fetchPending} className="px-4 py-2 bg-indigo-600 rounded text-white flex items-center gap-2">
          <FaSync /> Refresh
        </button>
      </div>

      {fetching ? (
        <p>Loading...</p>
      ) : (
        pendingRequests.map(req => {
          const isSelected = selected.includes(req._id);
          return (
            <div key={req._id} className={`p-4 rounded ${isSelected ? 'bg-indigo-900 border border-indigo-400' : 'bg-gray-900 border border-transparent'}`}>
              <p><strong>Student:</strong> {req.studentWallet}</p>
              <p><strong>Degree:</strong> {req.degreeId}</p>
              <p><strong>Nonce:</strong> {req.nonce}</p>
              <button 
                onClick={() => toggleSelect(req._id)} 
                className={`mt-2 px-4 py-1 rounded font-semibold transition-colors duration-200 ${isSelected ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
              >
                {isSelected ? 'Deselect' : 'Select'}
              </button>
            </div>
          );
        })
      )}

      {pendingRequests.length > 0 && (
        <button onClick={approveBatch} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 transition-colors duration-200 px-6 py-2 rounded text-white font-semibold disabled:opacity-50">
          {loading ? "Processing..." : "Approve Selected"}
        </button>
      )}
    </div>
  );
}