import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { BOARD_AUTHORITY_ADDRESS, SUPREME_AUTHORITY_ADDRESS } from "../config/Contract";
import BoardABI from "../../Blockchain/artifacts/contracts/BoardAuthority.sol/BoardAuthority.json";
import SupremeABI from "../../Blockchain/artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json";

export default function PendingBoardRequests({ account }) {
  const [pendingBoards, setPendingBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.ethereum || !account) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = provider.getSigner();

    const boardContract = new ethers.Contract(BOARD_AUTHORITY_ADDRESS, BoardABI.abi, signer);
    const supremeContract = new ethers.Contract(SUPREME_AUTHORITY_ADDRESS, SupremeABI.abi, provider);

    const fetchPendingRequests = async () => {
      setLoading(true);
      try {
        // Fetch all approved boards dynamically from SupremeAuthority
        const allBoards = await supremeContract.getAllApprovedBoards(); // <-- Make sure you have this function in SupremeAuthority
        const pending = [];

        for (const board of allBoards) {
          const isPending = await boardContract.pendingRequests(board, account);
          if (isPending) pending.push(board);
        }

        setPendingBoards(pending);
      } catch (err) {
        console.error("Error fetching pending board requests:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingRequests();
  }, [account]);

  const handleAccept = async (board) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = provider.getSigner();
      const boardContract = new ethers.Contract(BOARD_AUTHORITY_ADDRESS, BoardABI.abi, signer);

      const tx = await boardContract.acceptBoard(board);
      await tx.wait();

      setPendingBoards((p) => p.filter((b) => b !== board));
      alert(`✅ Accepted board ${board}`);
    } catch (err) {
      console.error(err);
      alert(`❌ Failed to accept board: ${err.reason || err.message}`);
    }
  };

  const handleReject = async (board) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = provider.getSigner();
      const boardContract = new ethers.Contract(BOARD_AUTHORITY_ADDRESS, BoardABI.abi, signer);

      const tx = await boardContract.rejectBoard(board);
      await tx.wait();

      setPendingBoards((p) => p.filter((b) => b !== board));
      alert(`❌ Rejected board ${board}`);
    } catch (err) {
      console.error(err);
      alert(`❌ Failed to reject board: ${err.reason || err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-yellow-400 bg-black">
        ⏳ Loading pending requests...
      </div>
    );
  }

  if (pendingBoards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-green-400 bg-black">
        ✅ No pending board requests. Your college is active or waiting for a board to request.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <h2 className="text-2xl font-bold mb-4 text-yellow-400">⚡ Pending Board Requests</h2>
      <div className="flex flex-col gap-4">
        {pendingBoards.map((board) => (
          <div
            key={board}
            className="flex gap-4 items-center bg-gray-800 p-4 rounded-lg border border-yellow-500"
          >
            <span className="font-mono">{board}</span>
            <button
              onClick={() => handleAccept(board)}
              className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded"
            >
              Accept
            </button>
            <button
              onClick={() => handleReject(board)}
              className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded"
            >
              Reject
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
