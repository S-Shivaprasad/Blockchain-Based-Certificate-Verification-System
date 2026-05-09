import { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios"; // ✅ ADDED
import SupremeABI from "../../../../Blockchain/artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json";
import { SUPREME_AUTHORITY_ADDRESS } from "../../config/Contract";

export default function ApproveBoard({ onBoardApproved }) {

  const [boardWallet, setBoardWallet] = useState("");
  const [boardName, setBoardName] = useState("");

  const [revokeWallet, setRevokeWallet] = useState("");

  const [degreeOptions, setDegreeOptions] = useState([]);
  const [selectedDegrees, setSelectedDegrees] = useState([]);

  const [loading, setLoading] = useState(false);
  const [isSupreme, setIsSupreme] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState("");

  const API = "http://localhost:5000/api/supreme-board";

  /* =========================================================
      INIT + WALLET SECURITY
  ========================================================= */

  useEffect(() => {

    init();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };

  }, []);

  const handleAccountsChanged = (accounts) => {
    if (!accounts.length) {
      logout();
      return;
    }

    const newWallet = accounts[0];

    if (
      connectedWallet &&
      newWallet.toLowerCase() !== connectedWallet.toLowerCase()
    ) {
      logout();
    }
  };

  const handleChainChanged = () => {
    logout();
  };

  const logout = () => {
    localStorage.removeItem("wallet");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  /* =========================================================
      INIT
  ========================================================= */

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

      const isSupremeWallet =
        wallet.toLowerCase() === supreme.toLowerCase();

      setIsSupreme(isSupremeWallet);

      if (!isSupremeWallet) {
        logout();
        return;
      }

      const degrees = await contract.getAllDegrees();

      setDegreeOptions(
        degrees.map((d) => ({
          id: d.degreeId,
          name: d.name,
        }))
      );

    } catch (err) {
      console.error(err);
    }
  };

  /* =========================================================
      DEGREE SELECT
  ========================================================= */

  const toggleDegree = (id) => {
    setSelectedDegrees((prev) =>
      prev.includes(id)
        ? prev.filter((d) => d !== id)
        : [...prev, id]
    );
  };

  /* =========================================================
      APPROVE BOARD
  ========================================================= */

  const approveBoard = async () => {
    try {
      if (!boardName)
        return alert("Board name required");

      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        SUPREME_AUTHORITY_ADDRESS,
        SupremeABI.abi,
        signer
      );

      const wallet = boardWallet.trim();

      // ✅ 1. Blockchain Tx
      const tx = await contract.approveBoardWithDegrees(
        wallet,
        boardName,
        selectedDegrees
      );

      await tx.wait();

      // ✅ 2. Backend Sync
      const token = localStorage.getItem("btcnv_token");

      await axios.post(
        API,
        {
          name: boardName,
          wallet: wallet,
          status: "approved",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("✅ Board Approved");

      setBoardWallet("");
      setBoardName("");
      setSelectedDegrees([]);

      onBoardApproved?.();

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
      REVOKE BOARD
  ========================================================= */

  const revokeBoard = async () => {
    try {
      if (!ethers.isAddress(revokeWallet))
        return alert("Invalid wallet address");

      const confirm = window.confirm(
        "⚠️ Are you sure you want to revoke this board?"
      );

      if (!confirm) return;

      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        SUPREME_AUTHORITY_ADDRESS,
        SupremeABI.abi,
        signer
      );

      // ✅ 1. Blockchain Tx
      const tx = await contract.revokeBoard(revokeWallet);
      await tx.wait();

      // ✅ 2. Backend Sync
      const token = localStorage.getItem("btcnv_token");

      await axios.post(
        `${API}/revoke`,
        { wallet: revokeWallet },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("❌ Board Revoked");

      setRevokeWallet("");

      onBoardApproved?.();

    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
      UI
  ========================================================= */

  return (
    <div className="bg-gray-900 border border-green-500 rounded-2xl p-6 shadow-lg space-y-6">

      <h2 className="text-2xl font-bold text-green-400 text-center">
        Board Management
      </h2>

      <p className="text-xs text-gray-400 text-center break-all">
        Connected: {connectedWallet}
      </p>

      {/* APPROVE SECTION */}

      <div className="space-y-4">
        <h3 className="text-green-400 font-semibold">
          Approve Board
        </h3>

        <input
          placeholder="Board Name"
          value={boardName}
          onChange={(e) => setBoardName(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded-lg"
        />

        <input
          placeholder="Board Wallet"
          value={boardWallet}
          onChange={(e) => setBoardWallet(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded-lg"
        />

        <div>
          <p className="text-green-400 mb-2">Assign Degrees</p>

          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {degreeOptions.map((d) => (
              <button
                key={d.id}
                onClick={() => toggleDegree(d.id)}
                className={`p-2 rounded text-sm ${
                  selectedDegrees.includes(d.id)
                    ? "bg-green-500 text-black"
                    : "bg-gray-700"
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={approveBoard}
          disabled={!isSupreme || loading}
          className="w-full bg-green-600 p-3 rounded-lg"
        >
          {loading ? "Processing..." : "Approve Board"}
        </button>
      </div>

      {/* REVOKE SECTION */}

      <div className="border-t border-red-500 pt-6 space-y-4">

        <h3 className="text-red-400 text-center">
          Revoke Board
        </h3>

        <input
          placeholder="Board Wallet"
          value={revokeWallet}
          onChange={(e) => setRevokeWallet(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded-lg"
        />

        <button
          onClick={revokeBoard}
          disabled={!isSupreme || loading}
          className="w-full bg-red-600 p-3 rounded-lg"
        >
          {loading ? "Processing..." : "Revoke Board"}
        </button>

      </div>
    </div>
  );
}