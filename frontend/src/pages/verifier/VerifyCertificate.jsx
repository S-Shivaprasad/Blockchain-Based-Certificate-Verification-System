import { useState } from "react";
import { ethers } from "ethers";
import { Scanner } from "@yudiel/react-qr-scanner";

/* ABIs */
import VerificationABI from "../../../../Blockchain/artifacts/contracts/CertificateVerification.sol/CertificateVerification.json";
import StorageABI from "../../../../Blockchain/artifacts/contracts/CertificateStorage.sol/CertificateStorage.json";
import SupremeABI from "../../../../Blockchain/artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json";
// 🔥 1. Add CollegeRegistry ABI
import CollegeABI from "../../../../Blockchain/artifacts/contracts/CollegeRegistry.sol/CollegeRegistry.json";

/* CONFIG */
import {
  CERTIFICATE_STORAGE_ADDRESS,
  CERTIFICATE_VERIFICATION_ADDRESS,
  SUPREME_AUTHORITY_ADDRESS,
  COLLEGE_REGISTRY_ADDRESS // 🔥 2. Add College Registry Address
} from "../../config/Contract";

export default function VerifyCertificate() {
  const [searchInput, setSearchInput] = useState("");
  const [searchType, setSearchType] = useState("CID");
  const [certificates, setCertificates] = useState([]);
  const [error, setError] = useState("");
  const [scan, setScan] = useState(false);
  const [loading, setLoading] = useState(false);

  const shorten = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  /* ================= VERIFY ================= */
  const verify = async (searchValue, type) => {
    try {
      if (!searchValue) return;

      setLoading(true);
      setError("");
      setCertificates([]);

      if (!window.ethereum) {
        setError("MetaMask not detected");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      const verifyContract = new ethers.Contract(
        CERTIFICATE_VERIFICATION_ADDRESS,
        VerificationABI.abi,
        provider
      );

      const storageContract = new ethers.Contract(
        CERTIFICATE_STORAGE_ADDRESS,
        StorageABI.abi,
        provider
      );

      const supremeContract = new ethers.Contract(
        SUPREME_AUTHORITY_ADDRESS,
        SupremeABI.abi,
        provider
      );

      // 🔥 3. Initialize College Contract
      const collegeContract = new ethers.Contract(
        COLLEGE_REGISTRY_ADDRESS,
        CollegeABI.abi,
        provider
      );

      let certIdsToFetch = [];

      if (type === "WALLET") {
        if (!ethers.isAddress(searchValue)) {
          throw new Error("Invalid Wallet Address");
        }

        const ids = await verifyContract.getCertificatesByStudent(searchValue);
        if (ids.length === 0) throw new Error("No certificates found");
        certIdsToFetch = ids;

      } else {
        const cidHash = ethers.keccak256(ethers.toUtf8Bytes(searchValue));
        const certId = await storageContract.cidToCertId(cidHash);

        if (certId === 0n) throw new Error("Certificate not found");
        certIdsToFetch = [certId];
      }

      let degreeNameMap = {};
      try {
        const allDegrees = await supremeContract.getAllDegrees();
        allDegrees.forEach((deg) => {
          degreeNameMap[deg.degreeId] = deg.name;
        });
      } catch {}

      const certPromises = certIdsToFetch.map((id) =>
        verifyContract.getCertificate(id)
      );

      const certData = await Promise.all(certPromises);

      const formatted = await Promise.all(
        certData.map(async (cert) => {
          let boardName = shorten(cert[2]);
          let collegeName = shorten(cert[3]); // Default to shortened address

          // Fetch Board Name
          try {
            const boardInfo = await supremeContract.getBoard(cert[2]);
            if (boardInfo.name) boardName = boardInfo.name;
            else if (boardInfo[0]) boardName = boardInfo[0];
          } catch {}

          // 🔥 4. Fetch College Name dynamically
          try {
            const collegeInfo = await collegeContract.getCollege(cert[3]);
            if (collegeInfo.name) collegeName = collegeInfo.name;
            else if (collegeInfo[0]) collegeName = collegeInfo[0];
          } catch {}

          return {
            certId: cert[0].toString(),
            student: cert[1],
            boardWallet: cert[2],
            boardName,
            collegeWallet: cert[3],
            collegeName, // Now holds actual name instead of wallet
            degreeId: cert[4],
            degreeName: degreeNameMap[cert[4]] || shorten(cert[4]),
            cid: cert[5],
            issuedAt: Number(cert[6]),
            revoked: cert[7],
          };
        })
      );

      setCertificates(formatted);

    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = () => verify(searchInput, searchType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-indigo-950 to-black p-6 text-white">

      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <h1 className="text-4xl font-extrabold mb-2 text-center bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
          Certificate Verification
        </h1>

        <p className="text-center text-gray-400 mb-8">
          Verify blockchain-issued certificates instantly 
        </p>

        {/* SEARCH CARD */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">

          {/* TOGGLE */}
          <div className="flex justify-center gap-6 mb-6">
            {["CID", "WALLET"].map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSearchType(type);
                  setSearchInput("");
                  setCertificates([]);
                  setError("");
                }}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                  searchType === type
                    ? "bg-indigo-600 shadow-lg"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {type === "CID" ? "Search by CID" : "Search by Wallet"}
              </button>
            ))}
          </div>

          {/* INPUT */}
          <input
            placeholder={
              searchType === "CID"
                ? "Paste IPFS CID..."
                : "Enter Wallet Address (0x...)"
            }
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/90 text-black focus:ring-2 focus:ring-indigo-500 mb-4"
          />

          {/* BUTTON */}
          <button
            onClick={handleSearchSubmit}
            disabled={!searchInput || loading}
            className="w-full py-3 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify Certificate"}
          </button>
        </div>

        {/* QR */}
        {searchType === "CID" && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setScan(!scan)}
              className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition"
            >
              {scan ? "Close Scanner" : "Scan QR"}
            </button>

            {scan && (
              <div className="mt-4 max-w-sm mx-auto rounded-xl overflow-hidden border border-white/20">
                <Scanner
                  onScan={(result) => {
                    if (result?.[0]?.rawValue) {
                      const val = result[0].rawValue;
                      const cid = val.includes("ipfs/")
                        ? val.split("ipfs/")[1]
                        : val;

                      setSearchInput(cid);
                      setScan(false);
                      verify(cid, "CID");
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mt-6 bg-red-500/20 border border-red-500 p-4 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* RESULTS */}
        {certificates.length > 0 && (
          <div className="mt-10 space-y-6">

            {certificates.map((cert) => (
              <div
                key={cert.certId}
                className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 rounded-xl hover:scale-[1.02] transition"
              >
                {/* HEADER */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">{cert.degreeName}</h2>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      cert.revoked
                        ? "bg-red-500/20 text-red-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {cert.revoked ? "REVOKED" : "VALID"}
                  </span>
                </div>

                {/* DETAILS */}
                <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                  <p><b>Student:</b> {shorten(cert.student)}</p>
                  <p><b>Date:</b> {new Date(cert.issuedAt * 1000).toLocaleDateString()}</p>
                  <p><b>Board:</b> {cert.boardName}</p>
                  
                  {/* 🔥 5. Display College Name instead of wallet address */}
                  <p><b>College:</b> {cert.collegeName}</p>

                  <p className="md:col-span-2 break-all">
                    <b>CID:</b>{" "}
                    <a
                      href={`https://ipfs.io/ipfs/${cert.cid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 underline"
                    >
                      {cert.cid}
                    </a>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}