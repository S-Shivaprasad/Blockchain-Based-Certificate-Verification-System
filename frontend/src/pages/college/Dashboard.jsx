import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";

import SupremeABI from "../../../../Blockchain/artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json";
import { SUPREME_AUTHORITY_ADDRESS } from "../../config/Contract";

import SubmitCertificate from "./SubmitCertificate";

export default function CollegeDashboard() {
  const navigate = useNavigate();

  const [paused, setPaused] = useState(false);

  // ✅ Extended Stats (non-breaking)
  const [stats, setStats] = useState({
    degreeCount: 0,
    submitted: 0,
    success: 0,
    failed: 0,
    lastBatchSize: 0
  });

  // ✅ Activity logs
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    const checkPause = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);

        const supreme = new ethers.Contract(
          SUPREME_AUTHORITY_ADDRESS,
          SupremeABI.abi,
          provider
        );

        const status = await supreme.isSystemPaused();
        setPaused(status);
      } catch (err) {
        console.error(err);
      }
    };

    checkPause();
  }, []);

  // ✅ Safe stats updater (wraps your existing logic)
  const handleStatsUpdate = (data) => {
    setStats((prev) => {
      const updated = { ...prev, ...data };

      // 🔥 Add activity log
      if (data.lastBatchSize) {
        const log = {
          time: new Date().toLocaleTimeString(),
          message: `Batch of ${data.lastBatchSize} processed`,
          success: data.success || 0,
          failed: data.failed || 0
        };

        setActivity((prevLogs) => [log, ...prevLogs.slice(0, 4)]);
      }

      return updated;
    });
  };

  // ✅ Derived Metrics (safe, no impact)
  const successRate =
    stats.submitted > 0
      ? ((stats.success / stats.submitted) * 100).toFixed(1)
      : 0;

  const failureRate =
    stats.submitted > 0
      ? ((stats.failed / stats.submitted) * 100).toFixed(1)
      : 0;

  const efficiency =
    successRate > 95
      ? "Excellent"
      : successRate > 80
      ? "Good"
      : successRate > 60
      ? "Average"
      : "Low";

  // ✅ Insights (data analysis)
  const insights = [];

  if (successRate > 95) {
    insights.push("High success rate — system performing optimally");
  }

  if (failureRate > 10) {
    insights.push("High failure rate — check input or gas issues");
  }

  if (stats.lastBatchSize > 100) {
    insights.push("Large batch detected — may cause failures");
  }

  if (stats.degreeCount === 0) {
    insights.push("No degrees assigned to this college");
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white px-6 py-8">

      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-10 flex justify-between items-start">

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            College Dashboard
          </h1>

          <p className="text-sm text-gray-400 mt-2">
            Certificate issuance and management
          </p>
        </div>

        <div className="flex gap-3 items-center">

          <button
            onClick={() => navigate("/college/year-students")}
            className="text-xs px-4 py-2 rounded-lg bg-blue-500/10 
            border border-blue-500/20 text-blue-400 
            hover:bg-blue-500/20 transition"
          >
            Year Wise Students
          </button>

          <span className="text-xs px-4 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">
            Authorized
          </span>

          <span
            className={`text-xs px-4 py-1 rounded-full border ${
              paused
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-green-500/10 text-green-400 border-green-500/20"
            }`}
          >
            {paused ? "Paused" : "Active"}
          </span>

        </div>
      </div>

      {/* ALERT */}
      {paused && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
            Certificate issuance is currently disabled
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6 mb-6">

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <p className="text-xs text-gray-400 mb-2">Certificates Submitted</p>
          <p className="text-2xl font-semibold">{stats.submitted}</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <p className="text-xs text-gray-400 mb-2">Allowed Degrees</p>
          <p className="text-2xl font-semibold">{stats.degreeCount}</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <p className="text-xs text-gray-400 mb-2">Batch Efficiency</p>
          <p className="text-2xl font-semibold">{efficiency}</p>
        </div>

      </div>

      {/* ✅ NEW METRICS */}
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6 mb-10">

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <p className="text-xs text-gray-400 mb-2">Success Rate</p>
          <p className="text-2xl font-semibold text-green-400">{successRate}%</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <p className="text-xs text-gray-400 mb-2">Failure Rate</p>
          <p className="text-2xl font-semibold text-red-400">{failureRate}%</p>
        </div>

        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <p className="text-xs text-gray-400 mb-2">Last Batch Size</p>
          <p className="text-2xl font-semibold">{stats.lastBatchSize}</p>
        </div>

      </div>

      {/* ✅ ACTIVITY LOG */}
      <div className="max-w-7xl mx-auto mb-10 bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-sm text-gray-400 mb-4">Recent Activity</h2>

        {activity.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent activity</p>
        ) : (
          activity.map((log, i) => (
            <div key={i} className="flex justify-between text-sm text-gray-300 mb-2">
              <span>{log.message}</span>
              <span className="text-xs text-gray-500">{log.time}</span>
            </div>
          ))
        )}
      </div>

      {/* ✅ INSIGHTS */}
      <div className="max-w-7xl mx-auto mb-10 bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-sm text-gray-400 mb-4">System Insights</h2>

        {insights.length === 0 ? (
          <p className="text-gray-500 text-sm">System running normally</p>
        ) : (
          <ul className="space-y-2 text-sm text-gray-300">
            {insights.map((i, idx) => (
              <li key={idx}>• {i}</li>
            ))}
          </ul>
        )}
      </div>

      {/* SUBMIT PANEL */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          
          <SubmitCertificate
            paused={paused}
            onStats={handleStatsUpdate} // ✅ replaced safely
          />

        </div>
      </div>

    </div>
  );
}