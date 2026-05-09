import { useState, useEffect } from "react";
import { ethers } from "ethers";
import SupremeABI from "../../../../Blockchain/artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json";
import { SUPREME_AUTHORITY_ADDRESS } from "../../config/Contract";

export default function RevokeCollege() {
  const [collegeWallet, setCollegeWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const [connectedWallet, setConnectedWallet] = useState("");
  const [isSupreme, setIsSupreme] = useState(false);
  const [isBlocked, setIsBlocked] = useState(null);

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

      const supreme = await contract.supreme();
      setIsSupreme(wallet.toLowerCase() === supreme.toLowerCase());

    } catch (err) {
      console.error(err);
    }
  };

  /* ============================================================
      CHECK COLLEGE STATUS
  ============================================================ */
  const checkCollege = async (wallet) => {
    try {
      if (!ethers.isAddress(wallet)) {
        setIsBlocked(null);
        return;
      }

      setChecking(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        SUPREME_AUTHORITY_ADDRESS,
        SupremeABI.abi,
        provider
      );

      const status = await contract.isCollegeBlocked(wallet);
      setIsBlocked(status);

    } catch (err) {
      console.error(err);
      setIsBlocked(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      if (collegeWallet) checkCollege(collegeWallet);
    }, 500);

    return () => clearTimeout(delay);
  }, [collegeWallet]);

  /* ============================================================
      BLOCK COLLEGE (EMERGENCY)
  ============================================================ */
  const blockCollege = async () => {
    try {
      if (!ethers.isAddress(collegeWallet)) {
        return alert("Invalid wallet address");
      }

      if (!isSupreme) {
        return alert("Only Supreme can perform this action");
      }

      if (isBlocked) {
        return alert("College already blocked");
      }

      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        SUPREME_AUTHORITY_ADDRESS,
        SupremeABI.abi,
        signer
      );

      const tx = await contract.blockCollege(collegeWallet); // 🔥 your function
      await tx.wait();

      alert("🚨 College Blocked Successfully");

      setIsBlocked(true);

    } catch (err) {
      console.error(err);
      alert(err?.reason || err?.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
      UNBLOCK COLLEGE (RECOVERY)
  ============================================================ */
  const unblockCollege = async () => {
    try {
      if (!ethers.isAddress(collegeWallet)) {
        return alert("Invalid wallet address");
      }

      if (!isSupreme) {
        return alert("Only Supreme can perform this action");
      }

      if (!isBlocked) {
        return alert("College is not blocked");
      }

      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        SUPREME_AUTHORITY_ADDRESS,
        SupremeABI.abi,
        signer
      );

      const tx = await contract.unblockCollege(collegeWallet); // 🔥 optional
      await tx.wait();

      alert("✅ College Restored Successfully");

      setIsBlocked(false);

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
    <div className="bg-gray-900 border border-yellow-500 rounded-2xl p-6 shadow-lg space-y-5">

      <h2 className="text-xl font-bold text-yellow-400 text-center">
        Emergency College Control
      </h2>

      <p className="text-xs text-gray-400 text-center break-all">
        Connected: {connectedWallet}
      </p>

      {!isSupreme && (
        <p className="text-red-400 text-center text-sm">
          ⚠️ Only Supreme wallet allowed
        </p>
      )}

      {/* INPUT */}
      <input
        type="text"
        placeholder="Enter College Wallet Address"
        value={collegeWallet}
        onChange={(e) => setCollegeWallet(e.target.value)}
        className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-yellow-500"
      />

      {/* STATUS */}
      {checking ? (
        <p className="text-yellow-400 text-sm">Checking status...</p>
      ) : isBlocked === true ? (
        <p className="text-red-400 text-sm">🚨 College is BLOCKED</p>
      ) : isBlocked === false ? (
        <p className="text-green-400 text-sm">✅ College is ACTIVE</p>
      ) : null}

      {/* ACTIONS */}
      <div className="flex gap-3">
        <button
          onClick={blockCollege}
          disabled={loading || !isSupreme || isBlocked}
          className="flex-1 bg-red-600 hover:bg-red-500 p-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? "Processing..." : "🚨 Block"}
        </button>

        <button
          onClick={unblockCollege}
          disabled={loading || !isSupreme || !isBlocked}
          className="flex-1 bg-green-600 hover:bg-green-500 p-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? "Processing..." : "Restore"}
        </button>
      </div>

    </div>
  );
}