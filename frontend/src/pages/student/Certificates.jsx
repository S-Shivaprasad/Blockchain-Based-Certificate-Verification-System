import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";

import StorageABI from "../../../../Blockchain/artifacts/contracts/CertificateStorage.sol/CertificateStorage.json";
import SupremeABI from "../../../../Blockchain/artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json";
// 🔥 1. Restore the College Registry ABI
import CollegeABI from "../../../../Blockchain/artifacts/contracts/CollegeRegistry.sol/CollegeRegistry.json"; 

import {
  CERTIFICATE_STORAGE_ADDRESS,
  SUPREME_AUTHORITY_ADDRESS,
  COLLEGE_REGISTRY_ADDRESS, // 🔥 2. Restore College Registry Address
} from "../../config/Contract";

export default function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [wallet, setWallet] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const shorten = (addr) => (addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "");

  const fetchCertificates = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!window.ethereum) {
        setError("MetaMask not detected");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();

      if (!accounts.length) {
        setError("Connect wallet first");
        return;
      }

      const studentWallet = accounts[0].address;
      setWallet(studentWallet);

      const storage = new ethers.Contract(CERTIFICATE_STORAGE_ADDRESS, StorageABI.abi, provider);
      const supreme = new ethers.Contract(SUPREME_AUTHORITY_ADDRESS, SupremeABI.abi, provider);
      
      // 🔥 3. Re-initialize the College Contract
      const collegeContract = new ethers.Contract(COLLEGE_REGISTRY_ADDRESS, CollegeABI.abi, provider);

      // 1. Fetch certificate IDs & Data
      const certIds = await storage.getStudentCertificates(studentWallet);
      const certData = await Promise.all(certIds.map((id) => storage.getCertificate(id)));

      // 2. Fetch degree names mapping
      const allDegrees = await supreme.getAllDegrees();
      const degreeMap = {};
      allDegrees.forEach((d) => {
        degreeMap[d.degreeId] = d.name;
      });

      // 3. Dynamically fetch Board and College names
      const boardNameCache = {};
      const collegeNameCache = {};

      const formatted = await Promise.all(
        certData.map(async (cert) => {
          const boardAddr = cert[2];
          const collegeAddr = cert[3];

          // Dynamically fetch Board Name (This stays on Supreme Authority)
          if (!boardNameCache[boardAddr]) {
            try {
              const boardInfo = await supreme.getBoard(boardAddr);
              // ethers v6 returns an array-like object, fallback to [0] if .name isn't parsed
              boardNameCache[boardAddr] = boardInfo.name || boardInfo[0];
            } catch (e) {
              boardNameCache[boardAddr] = shorten(boardAddr);
            }
          }

          // 🔥 4. Dynamically fetch College Name from the CORRECT contract
          if (!collegeNameCache[collegeAddr]) {
            try {
              const collegeInfo = await collegeContract.getCollege(collegeAddr);
              // Fallback to index [0] just in case the ABI doesn't strictly name the return variable
              collegeNameCache[collegeAddr] = collegeInfo.name || collegeInfo[0];
            } catch (e) {
              console.error("Failed to fetch college:", e);
              collegeNameCache[collegeAddr] = shorten(collegeAddr);
            }
          }

          return {
            certId: cert[0].toString(),
            studentWallet: cert[1],
            boardWallet: boardAddr,
            boardName: boardNameCache[boardAddr],
            collegeWallet: collegeAddr,
            collegeName: collegeNameCache[collegeAddr], // Will now correctly display!
            degreeId: cert[4],
            degreeName: degreeMap[cert[4]] || cert[4],
            ipfsCID: cert[5],
            issuedAt: Number(cert[6]),
            revoked: cert[7],
          };
        })
      );

      // Sort newest first
      formatted.sort((a, b) => b.issuedAt - a.issuedAt);
      setCertificates(formatted);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch certificates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
    if (window.ethereum) window.ethereum.on("accountsChanged", fetchCertificates);
    return () => {
      if (window.ethereum) window.ethereum.removeListener("accountsChanged", fetchCertificates);
    };
  }, [fetchCertificates]);

  const filteredCertificates = certificates.filter((c) => {
    if (filter === "ACTIVE") return !c.revoked;
    if (filter === "REVOKED") return c.revoked;
    return true;
  });

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">My Certificates</h2>
          <p className="text-sm text-gray-300">Wallet: {shorten(wallet)}</p>
        </div>
        <div className="flex gap-3">
          {["ALL", "ACTIVE", "REVOKED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1 rounded-lg text-sm font-semibold transition ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-white/20 text-gray-200 hover:bg-white/30"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center text-gray-300 py-10">Loading certificates...</div>}
      {error && <div className="text-center text-red-300 py-4">{error}</div>}
      {!loading && !error && filteredCertificates.length === 0 && (
        <div className="text-center text-gray-300">No certificates found.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCertificates.map((cert, index) => (
          <motion.div
            key={cert.certId}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col"
          >
            {/* Status Badge */}
            <div className={`absolute top-0 left-0 w-full h-1 ${cert.revoked ? "bg-red-500" : "bg-emerald-500"}`} />
            <div className="absolute top-4 right-4">
               <span className={`px-3 py-1 rounded-full text-[10px] tracking-wider font-bold ${cert.revoked ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                 {cert.revoked ? "REVOKED" : "ACTIVE"}
               </span>
            </div>

            {/* Information matching your layout */}
            <h3 className="text-2xl font-bold text-white mt-2 mb-4">
              {cert.degreeName}
            </h3>
            
            <div className="space-y-2 mb-6 flex-grow">
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-gray-400">Issued:</span> {new Date(cert.issuedAt * 1000).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-gray-400">Board:</span> {cert.boardName}
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-gray-400">College:</span> {cert.collegeName}
              </p>
            </div>

            {/* QR Code and CID */}
            <div className="flex flex-col items-center justify-center mt-auto border-t border-white/10 pt-6">
              <div className="bg-white rounded-xl p-3 mb-3 shadow-lg">
                <QRCodeCanvas
                  value={`https://ipfs.io/ipfs/${cert.ipfsCID}`}
                  size={130}
                  level={"H"}
                />
              </div>
              <a 
                href={`https://ipfs.io/ipfs/${cert.ipfsCID}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-indigo-300 hover:text-indigo-400 font-mono break-all text-center transition-colors px-2"
              >
                {cert.ipfsCID}
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}