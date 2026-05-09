import { useState, useEffect } from "react";
import { ethers } from "ethers";
import SupremeABI from "../../../../Blockchain/artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json";
import { SUPREME_AUTHORITY_ADDRESS } from "../../config/Contract";

export default function RevokeStudent() {
  const [studentWallet, setStudentWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const [connectedWallet, setConnectedWallet] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isBlacklisted, setIsBlacklisted] = useState(null);

  /* ============================================================
      INIT
  ============================================================ */
  useEffect(() => {
    init();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", init);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", init);
      }
    };
  }, []);

  const init = async () => {
    try {
      if (!window.ethereum) return;

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const wallet = await signer.getAddress();

      setConnectedWallet(wallet);

      const contract = new ethers.Contract(
        SUPREME_AUTHORITY_ADDRESS,
        SupremeABI.abi,
        provider
      );

      const isBoard = await contract.isApprovedBoard(wallet);
      const supreme = await contract.supreme();

     setIsAuthorized(
  wallet.toLowerCase() === supreme.toLowerCase()
);

    } catch (err) {
      console.error(err);
    }
  };

  /* ============================================================
      CHECK STUDENT STATUS
  ============================================================ */
  const checkStudent = async (wallet) => {
    try {
      if (!ethers.isAddress(wallet)) {
        setIsBlacklisted(null);
        return;
      }

      setChecking(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        SUPREME_AUTHORITY_ADDRESS,
        SupremeABI.abi,
        provider
      );

      const status = await contract.isStudentBlacklisted(wallet);
      setIsBlacklisted(status);

    } catch (err) {
      console.error(err);
      setIsBlacklisted(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      if (studentWallet) checkStudent(studentWallet);
    }, 500);

    return () => clearTimeout(delay);
  }, [studentWallet]);

  /* ============================================================
      REVOKE
  ============================================================ */
  const revokeStudent = async () => {
  try {
    if (!window.ethereum) return alert("MetaMask not found");

    if (!ethers.isAddress(studentWallet)) {
      return alert("Invalid wallet address");
    }

    if (!isAuthorized) {
      return alert("Only Supreme can blacklist");
    }

    if (isBlacklisted) {
      return alert("Student already blacklisted");
    }

    setLoading(true);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const contract = new ethers.Contract(
      SUPREME_AUTHORITY_ADDRESS,
      SupremeABI.abi,
      signer
    );

    // ✅ FIXED: use blacklist function
    const tx = await contract.blacklistStudent(studentWallet);
    await tx.wait();

    alert("🚫 Student Blacklisted Successfully");

    setStudentWallet("");
    setIsBlacklisted(null);

  } catch (err) {
    console.error(err);

    // ✅ Better error decode
    if (err?.data === "0x9ea50d3a") {
      alert("Only Supreme can perform this action");
    } else {
      alert(err?.reason || err?.message || "Transaction failed");
    }

  } finally {
    setLoading(false);
  }
};

const unblacklistStudent = async () => {
  try {
    if (!window.ethereum) return alert("MetaMask not found");

    if (!ethers.isAddress(studentWallet)) {
      return alert("Invalid wallet address");
    }

    if (!isAuthorized) {
      return alert("Only Supreme can perform this action");
    }

    if (isBlacklisted === false) {
      return alert("Student is not blacklisted");
    }

    setLoading(true);

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const contract = new ethers.Contract(
      SUPREME_AUTHORITY_ADDRESS,
      SupremeABI.abi,
      signer
    );

    // ✅ CALL UNBLACKLIST
    const tx = await contract.removeFromBlacklist(studentWallet);
    await tx.wait();

    alert("✅ Student Unblacklisted Successfully");

    setStudentWallet("");
    setIsBlacklisted(null);

  } catch (err) {
    console.error(err);
    alert(err?.reason || err?.message || "Transaction failed");
  } finally {
    setLoading(false);
  }
};

  /* ============================================================
      UI
  ============================================================ */
  return (
    <div className="bg-gray-900 border border-red-500 rounded-2xl p-6 shadow-lg space-y-5">

      <h2 className="text-xl font-bold text-red-400 text-center">
        Revoke Student Access
      </h2>

      <p className="text-xs text-gray-400 text-center break-all">
        Connected: {connectedWallet}
      </p>

      {!isAuthorized && (
        <p className="text-red-400 text-center text-sm">
          ⚠️ Only Board or Supreme can perform this action
        </p>
      )}

      {/* INPUT */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Enter Student Wallet Address"
          value={studentWallet}
          onChange={(e) => setStudentWallet(e.target.value)}
          className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        />

        {/* STATUS */}
        {checking ? (
          <p className="text-yellow-400 text-sm">Checking status...</p>
        ) : isBlacklisted === true ? (
          <p className="text-red-400 text-sm">
            ⚠️ Student already blacklisted
          </p>
        ) : isBlacklisted === false ? (
          <p className="text-green-400 text-sm">
            ✅ Student is active
          </p>
        ) : null}
      </div>

      {/* ACTION */}
      <button
        onClick={revokeStudent}
        disabled={
          loading ||
          !isAuthorized ||
          !ethers.isAddress(studentWallet) ||
          isBlacklisted
        }
        className="w-full bg-red-600 hover:bg-red-500 transition p-3 rounded-lg font-semibold disabled:opacity-50"
      >
        {loading ? "Processing..." : "Revoke Student"}
      </button>

      <button
  onClick={unblacklistStudent}
  disabled={
    loading ||
    !isAuthorized ||
    !ethers.isAddress(studentWallet) ||
    isBlacklisted === false
  }
  className="w-full bg-green-600 hover:bg-green-500 transition p-3 rounded-lg font-semibold disabled:opacity-50"
>
  {loading ? "Processing..." : "Unblacklist Student"}
</button>

    </div>
  );
}