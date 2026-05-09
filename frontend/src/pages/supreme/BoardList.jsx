import { useEffect, useState } from "react";
import axios from "axios";
import { FaCopy, FaSearch } from "react-icons/fa";

export default function BoardsList({ refresh }) {
  const [boards, setBoards] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const API = "http://localhost:5000/api/supreme-board";

  /* ============================================================
      FETCH
  ============================================================ */
  const fetchBoards = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("btcnv_token");
      if (!token) throw new Error("Login required");

      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = Array.isArray(res.data) ? res.data : [];

      setBoards(data);
      setFiltered(data);

    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setBoards([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, [refresh]);

  /* ============================================================
      FILTER LOGIC
  ============================================================ */
  useEffect(() => {
    let temp = [...boards];

    if (search) {
      temp = temp.filter(
        (b) =>
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.wallet.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      temp = temp.filter((b) => b.status === statusFilter);
    }

    setFiltered(temp);
  }, [search, statusFilter, boards]);

  /* ============================================================
      COPY WALLET
  ============================================================ */
  const copyWallet = (wallet) => {
    navigator.clipboard.writeText(wallet);
    alert("Wallet copied");
  };

  /* ============================================================
      UI
  ============================================================ */
  return (
    <div className="space-y-5">

      {/* FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-3">

        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-3 text-gray-400 text-sm" />

          <input
            placeholder="Search by board name or wallet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-sm"
        >
          <option value="all">All Boards</option>
          <option value="approved">Approved</option>
          <option value="revoked">Revoked</option>
        </select>

      </div>

      {/* TABLE STATES */}

      {loading ? (
        <div className="text-center text-gray-400 py-10">
          Loading boards...
        </div>
      ) : error ? (
        <div className="text-center text-red-400 py-10">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-10">
          No boards found
        </div>
      ) : (

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="text-gray-400 border-b border-white/10">
              <tr>
                <th className="py-3 text-left">Board Name</th>
                <th className="py-3 text-left">Wallet</th>
                <th className="py-3 text-left">Status</th>
                <th className="py-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody>

              {filtered.map((b) => (

                <tr
                  key={b.wallet}
                  className="border-b border-white/5 hover:bg-white/5 transition"
                >

                  <td className="py-3 font-medium">
                    {b.name}
                  </td>

                  <td className="py-3 font-mono text-xs text-gray-300">
                    {b.wallet.slice(0, 6)}...{b.wallet.slice(-4)}
                  </td>

                  <td className="py-3">

                    {b.status === "approved" ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                        Approved
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">
                        Revoked
                      </span>
                    )}

                  </td>

                  <td className="py-3 text-center">

                    <button
                      onClick={() => copyWallet(b.wallet)}
                      className="inline-flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition"
                    >
                      <FaCopy />
                      Copy
                    </button>

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