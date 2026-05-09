
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import axios from "axios";

import {
  FaUniversity,
  FaList,
  FaCertificate,
  FaSync,
} from "react-icons/fa";

import ApproveColleges from "./ApproveColleges";
import CheckConfig from "./checkjutu";
import CollegeList from "./CollegeList";
import IssueCertificate from "./IssueCertificate";

import BoardABI from "../../../../Blockchain/artifacts/contracts/BoardAuthority.sol/BoardAuthority.json";
import StorageABI from "../../../../Blockchain/artifacts/contracts/CertificateStorage.sol/CertificateStorage.json";

import {
  BOARD_AUTHORITY_ADDRESS,
  CERTIFICATE_STORAGE_ADDRESS,
} from "../../config/Contract";

export default function BoardDashboard() {

  const [refresh, setRefresh] = useState(false);
  const [activePanel, setActivePanel] = useState("approveColleges");

  const [collegeCount, setCollegeCount] = useState(0);
  const [certificateCount, setCertificateCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);

  /* ================= LOAD STATS ================= */

  const loadStats = async () => {

    try {

      if (!window.ethereum) return;

      setLoadingStats(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const boardAddress = await signer.getAddress();

      const board = new ethers.Contract(
        BOARD_AUTHORITY_ADDRESS,
        BoardABI.abi,
        provider
      );

      const storage = new ethers.Contract(
        CERTIFICATE_STORAGE_ADDRESS,
        StorageABI.abi,
        provider
      );

      /* ===== Colleges ===== */

      const colleges = await board.getApprovedColleges(boardAddress);
      setCollegeCount(colleges.length);

      /* ===== Certificates ===== */

      try {

        const issued = await storage.getBoardCertificates(boardAddress);
        setCertificateCount(issued.length);

      } catch {
        setCertificateCount(0);
      }

      /* ===== Pending Requests ===== */

      try {

        const token = localStorage.getItem("btcnv_token");

        const res = await axios.get(
          "http://localhost:5000/board/pending-certificates",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setPendingCount(res.data.requests?.length || 0);

      } catch {
        setPendingCount(0);
      }

    } catch (err) {

      console.error("Stats Load Error:", err);

    } finally {

      setLoadingStats(false);

    }
  };

  /* ================= INIT ================= */

  useEffect(() => {
    loadStats();
  }, [refresh]);

  /* ================= MENU ================= */

  const menuItems = [
    {
      key: "approveColleges",
      label: "Approve Colleges",
      icon: FaUniversity,
    },
    {
      key: "collegeList",
      label: "College List",
      icon: FaList,
    },
    {
      key: "issueCertificate",
      label: "Issue Certificates",
      icon: FaCertificate,
    },
  ];

  /* ================= PANEL ================= */

  const renderPanel = () => {

    switch (activePanel) {

      case "approveColleges":
        return (
          <ApproveColleges
            onCollegeUpdated={() => setRefresh(!refresh)}
          />
        );

      case "collegeList":
        return <CollegeList key={refresh} />;

      case "issueCertificate":
        return <IssueCertificate />;

      default:
        return null;

    }

  };

  return (

    <div className="flex min-h-screen bg-gradient-to-br from-black via-gray-900 to-indigo-950 text-white">

      {/* ================= SIDEBAR ================= */}

      <aside className="w-72 bg-white/5 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col">

        <h2 className="text-2xl font-bold text-emerald-400 mb-10 text-center">
          Board Panel
        </h2>

        <ul className="space-y-4">

          {menuItems.map((item) => {

            const Icon = item.icon;
            const active = activePanel === item.key;

            return (
              <motion.li
                key={item.key}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActivePanel(item.key)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
                  active
                    ? "bg-emerald-500/20 border border-emerald-500 shadow-lg"
                    : "hover:bg-white/10"
                }`}
              >
                <Icon className="text-lg" />
                <span className="font-medium">{item.label}</span>
              </motion.li>
            );

          })}

        </ul>

        <div className="mt-auto text-center text-xs text-gray-400 pt-6">
          Blockchain Certificate Network
        </div>

      </aside>

      {/* ================= MAIN ================= */}

      <main className="flex-1 p-8 space-y-6 overflow-y-auto">

        {/* ================= HEADER ================= */}

        <div className="flex justify-between items-center">

          <h1 className="text-3xl font-bold">

            {activePanel === "approveColleges" && "Approve Colleges"}
            {activePanel === "collegeList" && "Your Colleges"}
            {activePanel === "issueCertificate" && "Certificate Issuance"}

          </h1>

          <div className="flex items-center gap-3">

            <button
              onClick={loadStats}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-sm"
            >
              <FaSync />
              Refresh Stats
            </button>

            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-4 py-1 rounded-full">
              BOARD ROLE
            </span>

          </div>

        </div>
        <CheckConfig />


        {/* ================= STATS ================= */}

        <div className="grid md:grid-cols-3 gap-4">

          <div className="bg-white/5 border border-white/10 rounded-xl p-5">

            <p className="text-sm text-gray-400">
              Colleges
            </p>

            <h3 className="text-3xl font-bold text-emerald-400">

              {loadingStats ? "..." : collegeCount}

            </h3>

          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5">

            <p className="text-sm text-gray-400">
              Certificates Issued
            </p>

            <h3 className="text-3xl font-bold text-blue-400">

              {loadingStats ? "..." : certificateCount}

            </h3>

          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5">

            <p className="text-sm text-gray-400">
              Pending Requests
            </p>

            <h3 className="text-3xl font-bold text-yellow-400">

              {loadingStats ? "..." : pendingCount}

            </h3>

          </div>

        </div>

        {/* ================= PANEL ================= */}

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">

          <AnimatePresence mode="wait">

            <motion.div
              key={activePanel}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >

              {renderPanel()}

            </motion.div>

          </AnimatePresence>

        </div>

      </main>

    </div>

  );

}
