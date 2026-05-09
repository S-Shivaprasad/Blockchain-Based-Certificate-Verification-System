import { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  FaUniversity,
  FaUserSlash,
  FaSchool,
  FaList,
  FaWallet
} from "react-icons/fa";

import SupremeABI from "../../../../Blockchain/artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json";
import { SUPREME_AUTHORITY_ADDRESS } from "../../config/Contract";

import ApproveBoard from "./ApproveBoard";
import BoardsList from "./BoardList";
import RevokeStudent from "./RevokeStudent";
import RevokeCollege from "./RevokeCollege";

export default function SupremeDashboard() {

  const [refresh, setRefresh] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loadingPause, setLoadingPause] = useState(false);

  const [wallet, setWallet] = useState("");
  const [isSupreme, setIsSupreme] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activePanel, setActivePanel] = useState("boards");


  /* =========================================================
      WALLET SECURITY + INIT
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

  }, [refresh]);


  const handleAccountsChanged = (accounts) => {

    if (!accounts.length) {
      logout();
      return;
    }

    const newWallet = accounts[0];

    if (
      wallet &&
      newWallet.toLowerCase() !== wallet.toLowerCase()
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

      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setWallet(address);

      const contract = new ethers.Contract(
        SUPREME_AUTHORITY_ADDRESS,
        SupremeABI.abi,
        provider
      );

      const supreme = await contract.supreme();

      const isSupremeWallet =
        address.toLowerCase() === supreme.toLowerCase();

      setIsSupreme(isSupremeWallet);

      if (!isSupremeWallet) {
        logout();
        return;
      }

      const status = await contract.isSystemPaused();
      setPaused(status);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  /* =========================================================
      SYSTEM CONTROL
  ========================================================= */

  const pauseSystem = async () => {
    try {

      setLoadingPause(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        SUPREME_AUTHORITY_ADDRESS,
        SupremeABI.abi,
        signer
      );

      const tx = await contract.pauseSystem();
      await tx.wait();

      setRefresh(prev => !prev);

    } catch (err) {
      alert(err.reason || err.message);
    } finally {
      setLoadingPause(false);
    }
  };


  const unpauseSystem = async () => {
    try {

      setLoadingPause(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        SUPREME_AUTHORITY_ADDRESS,
        SupremeABI.abi,
        signer
      );

      const tx = await contract.unpauseSystem();
      await tx.wait();

      setRefresh(prev => !prev);

    } catch (err) {
      alert(err.reason || err.message);
    } finally {
      setLoadingPause(false);
    }
  };


  /* =========================================================
      MENU
  ========================================================= */

  const menu = [
    { id: "boards", label: "Approve Board", icon: <FaUniversity /> },
    { id: "students", label: "Student Control", icon: <FaUserSlash /> },
    { id: "colleges", label: "College Control", icon: <FaSchool /> },
    { id: "boardsList", label: "Boards Registry", icon: <FaList /> }
  ];


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading Supreme Dashboard...
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white flex">


      {/* SIDEBAR */}

      <div className="w-64 bg-black/40 border-r border-white/10 p-6 hidden md:flex flex-col">

        <h2 className="text-xl font-semibold mb-8">
          Supreme Panel
        </h2>

        <div className="space-y-2">

          {menu.map((item) => (

            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition
              ${activePanel === item.id
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-white/10"
                }`}
            >
              {item.icon}
              {item.label}
            </button>

          ))}

        </div>

      </div>


      {/* MAIN */}

      <div className="flex-1 px-6 py-8">


        {/* HEADER */}

        <div className="max-w-7xl mx-auto mb-10 flex justify-between items-center">

          <div>

            <h1 className="text-3xl font-semibold">
              Supreme Authority Dashboard
            </h1>

            <p className="text-gray-400 text-sm mt-2">
              Governance Control Panel
            </p>

          </div>


          <div className="flex items-center gap-3 text-xs text-gray-400 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
            <FaWallet />
            {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </div>

        </div>


        {/* STATUS */}

        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6 mb-10">

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-xs text-gray-400 mb-2">
              System Status
            </p>

            <p className={`text-lg font-semibold ${paused ? "text-red-400" : "text-green-400"}`}>
              {paused ? "Paused" : "Active"}
            </p>
          </div>


          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-xs text-gray-400 mb-2">
              Access Level
            </p>

            <p className="text-green-400 text-lg font-semibold">
              Supreme Authority
            </p>
          </div>


          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">

            <p className="text-xs text-gray-400 mb-4">
              System Control
            </p>

            {!paused ? (

              <button
                onClick={pauseSystem}
                disabled={loadingPause}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-3 rounded-xl"
              >
                {loadingPause ? "Processing..." : "Pause System"}
              </button>

            ) : (

              <button
                onClick={unpauseSystem}
                disabled={loadingPause}
                className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl"
              >
                {loadingPause ? "Processing..." : "Unpause System"}
              </button>

            )}

          </div>

        </div>


        {/* PANEL AREA */}

        <div className="max-w-7xl mx-auto">

          {activePanel === "boards" && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <ApproveBoard onBoardApproved={() => setRefresh(prev => !prev)} />
            </div>
          )}

          {activePanel === "boardsList" && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <BoardsList refresh={refresh} />
            </div>
          )}

          {activePanel === "students" && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <RevokeStudent />
            </div>
          )}

          {activePanel === "colleges" && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <RevokeCollege />
            </div>
          )}

        </div>

      </div>

    </div>
  );
}