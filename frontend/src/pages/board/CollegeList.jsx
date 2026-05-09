import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { FaSync, FaCopy } from "react-icons/fa";

import BoardABI from "../../../../Blockchain/artifacts/contracts/BoardAuthority.sol/BoardAuthority.json";
import CollegeRegistryABI from "../../../../Blockchain/artifacts/contracts/CollegeRegistry.sol/CollegeRegistry.json";

import {
  BOARD_AUTHORITY_ADDRESS,
  COLLEGE_REGISTRY_ADDRESS
} from "../../config/Contract";

export default function CollegeList() {

  const [colleges, setColleges] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  /* ================= FETCH ================= */

  const fetchColleges = async () => {

    try {

      setLoading(true);
      setError("");

      if (!window.ethereum) {
        setError("Metamask not installed");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const boardAddress = await signer.getAddress();

      const boardContract = new ethers.Contract(
        BOARD_AUTHORITY_ADDRESS,
        BoardABI.abi,
        provider
      );

      const registryContract = new ethers.Contract(
        COLLEGE_REGISTRY_ADDRESS,
        CollegeRegistryABI.abi,
        provider
      );

      /* 1️⃣ get approved college wallets */

      const wallets = await boardContract.getApprovedColleges(boardAddress);

      const list = [];

      /* 2️⃣ fetch metadata from CollegeRegistry */

      for (const wallet of wallets) {

        try {

          const college = await registryContract.getCollege(wallet);

          list.push({
            name: college.name,
            wallet: wallet,
            code: college.collegeCodeString,
            status: college.active ? "approved" : "revoked"
          });

        } catch {
          list.push({
            name: "Unknown",
            wallet: wallet,
            code: "-",
            status: "approved"
          });
        }

      }

      setColleges(list);
      setFiltered(list);

    } catch (err) {

      console.error(err);
      setError("Failed to load colleges from blockchain");
      setColleges([]);
      setFiltered([]);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  /* ================= FILTER ================= */

  useEffect(() => {

    if (filter === "all") {
      setFiltered(colleges);
    } else {
      setFiltered(colleges.filter((c) => c.status === filter));
    }

  }, [filter, colleges]);

  /* ================= COPY ================= */

  const copyWallet = (wallet) => {
    navigator.clipboard.writeText(wallet);
    alert("Copied!");
  };

  /* ================= UI ================= */

  return (

    <div className="w-full space-y-6">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <h2 className="text-2xl font-bold text-blue-400">
          🎓 Approved Colleges
        </h2>

        <button
          onClick={fetchColleges}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm"
        >
          <FaSync />
          Refresh
        </button>

      </div>

      {/* FILTER */}

      <div className="flex gap-3 flex-wrap">

        {["all", "approved"].map((f) => (

          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              filter === f
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300"
            }`}
          >
            {f.toUpperCase()}
          </button>

        ))}

      </div>

      {/* LOADING */}

      {loading && (
        <div className="text-center py-10 text-gray-400">
          Loading colleges from blockchain...
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-center">
          {error}
        </div>
      )}

      {/* EMPTY */}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No approved colleges found.
        </div>
      )}

      {/* TABLE */}

      {!loading && filtered.length > 0 && (

        <div className="overflow-x-auto bg-gray-900 border border-blue-500/30 rounded-2xl shadow-xl">

          <table className="w-full text-left">

            <thead className="bg-gray-800 text-gray-300 text-xs uppercase">
              <tr>
                <th className="px-6 py-4">College</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Wallet</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>

            <tbody>

              {filtered.map((c) => (

                <tr
                  key={c.wallet}
                  className="border-b border-gray-800 hover:bg-gray-800/60"
                >

                  <td className="px-6 py-4 text-white font-semibold">
                    {c.name}
                  </td>

                  <td className="px-6 py-4 text-blue-400">
                    {c.code}
                  </td>

                  <td className="px-6 py-4 text-gray-400 font-mono text-sm flex items-center gap-2">
                    {c.wallet.slice(0,6)}...{c.wallet.slice(-4)}

                    <FaCopy
                      className="cursor-pointer hover:text-white"
                      onClick={() => copyWallet(c.wallet)}
                    />
                  </td>

                  <td className="px-6 py-4">
                    <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                      Approved
                    </span>
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>

  );
}