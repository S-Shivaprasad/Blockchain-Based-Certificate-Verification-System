import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import YearWiseStudents from "./pages/college/yearwise"

/* Pages */
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ConnectWallet from "./components/common/ConnectWallet";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

/* Dashboards */
import SupremeDashboard from "./pages/supreme/Dashboard";
import BoardDashboard from "./pages/board/Dashboard";
import CollegeDashboard from "./pages/college/Dashboard";
import StudentDashboard from "./pages/student/Dashboard";
import VerifyCertificate from "./pages/verifier/VerifyCertificate";

/* Blockchain */
import SupremeABI from "../../Blockchain/artifacts/contracts/SupremeAuthority.sol/SupremeAuthority.json";
import CollegeRegistryABI from "../../Blockchain/artifacts/contracts/CollegeRegistry.sol/CollegeRegistry.json";

import {
  SUPREME_AUTHORITY_ADDRESS,
  COLLEGE_REGISTRY_ADDRESS,
} from "./config/Contract";

/* ========================================================= */
function AppHeader({ user, account, logout, children }) {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-black border-b border-green-500/30 px-8 py-4 flex justify-between items-center">
        <h1
          onClick={handleLogoClick}
          className="text-xl font-bold text-green-400 cursor-pointer hover:text-green-300 transition"
        >
          Blockchain Certificate Network
        </h1>

        <div className="flex items-center gap-4">
          <span className="text-xs uppercase bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
            {user?.role}
          </span>

          {account && (
            <span className="text-xs font-mono bg-gray-800 px-3 py-1 rounded">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          )}

          <button
            onClick={logout}
            className="text-xs bg-red-600 hover:bg-red-500 px-4 py-1 rounded"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="p-8">{children}</div>
    </div>
  );
}

/* ========================================================= */
function App() {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainRole, setChainRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);

  /* ================= LOGOUT ================= */
  const logout = useCallback(() => {
    localStorage.removeItem("btcnv_token");
    localStorage.removeItem("wallet");

    setUser(null);
    setAccount(null);
    setChainRole(null);
  }, []);

  /* ================= AUTH + WALLET RESTORE ================= */
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("btcnv_token");

      if (token) {
        try {
          const decoded = jwtDecode(token);

          if (decoded.exp * 1000 > Date.now()) {
            setUser(decoded);
          } else {
            localStorage.removeItem("btcnv_token");
          }
        } catch {
          localStorage.removeItem("btcnv_token");
        }
      }

      /* Restore wallet */
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();

          if (accounts.length > 0) {
            const addr = accounts[0].address || accounts[0];
            setAccount(addr);
          }
        } catch (err) {
          console.error("Wallet restore failed", err);
        }
      }

      setAuthLoading(false);
    };

    init();
  }, []);

  /* ================= METAMASK LISTENERS ================= */
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      const savedWallet = localStorage.getItem("wallet");

      /* Wallet disconnected */
      if (!accounts.length) {
        logout();
        return;
      }

      const newWallet = accounts[0].toLowerCase();

      /* Wallet changed */
      if (savedWallet && savedWallet.toLowerCase() !== newWallet) {
        logout();
        return;
      }

      setAccount(accounts[0]);
      setChainRole(null);
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );

      window.ethereum.removeListener(
        "chainChanged",
        handleChainChanged
      );
    };
  }, [logout]);

  /* ================= ROLE RESOLUTION ================= */
  const resolveChainRole = useCallback(async () => {
    if (!account) return;

    try {
      setRoleLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const cleanAccount = account.toLowerCase();

      const supreme = new ethers.Contract(
        SUPREME_AUTHORITY_ADDRESS,
        SupremeABI.abi,
        provider
      );

      const registry = new ethers.Contract(
        COLLEGE_REGISTRY_ADDRESS,
        CollegeRegistryABI.abi,
        provider
      );

      /* SUPREME */
      const supremeAddress = (await supreme.supreme()).toLowerCase();

      if (supremeAddress === cleanAccount) {
        setChainRole("supreme");
        return;
      }

      /* BOARD + COLLEGE */
      const [isBoard, isCollege] = await Promise.all([
        supreme.isApprovedBoard(cleanAccount),
        registry.isRegisteredCollege(cleanAccount),
      ]);

      if (isBoard) {
        setChainRole("board");
        return;
      }

      if (isCollege) {
        setChainRole("college");
        return;
      }

      /* STUDENT */
      const isStudent = await supreme.isStudent(cleanAccount);

      if (isStudent) {
        setChainRole("student");
        return;
      }

      /* DEFAULT */
      setChainRole("verifier");

    } catch (err) {
      console.error("Role resolution failed", err);
      setChainRole("verifier");
    } finally {
      setRoleLoading(false);
    }
  }, [account]);

  /* ================= TRIGGER ================= */
  useEffect(() => {
    if (account) {
      resolveChainRole();
    }
  }, [account, resolveChainRole]);

  /* ================= LOADING ================= */
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-green-400 bg-black">
        Checking authentication...
      </div>
    );
  }

  /* ================= DASHBOARD ================= */
  const renderDashboard = () => {
    if (!user) return <Navigate to="/" />;

    if (!account) return <ConnectWallet setAccount={setAccount} />;

    if (roleLoading || !chainRole) {
      return (
        <div className="flex justify-center items-center h-screen text-green-400 bg-black">
          Verifying On-Chain Authority...
        </div>
      );
    }

    switch (chainRole) {
      case "supreme":
        return <SupremeDashboard />;

      case "board":
        return <BoardDashboard />;

      case "college":
        return <CollegeDashboard />;

      case "student":
        return <StudentDashboard />;

      default:
        return <VerifyCertificate />;
    }
  };

  /* ================= ROUTES ================= */
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route
          path="/login"
          element={
            user
              ? <Navigate to="/app" />
              : <Login setUser={setUser} />
          }
        />

        <Route
          path="/signup"
          element={
            user
              ? <Navigate to="/app" />
              : <Signup />
          }
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password/:token"
          element={<ResetPassword />}
        />

        <Route
          path="/app"
          element={
            <AppHeader
              user={user}
              account={account}
              logout={logout}
            >
              {renderDashboard()}
            </AppHeader>
          }
        />
        <Route
  path="/college/year-students"
  element={
    <AppHeader
      user={user}
      account={account}
      logout={logout}
    >
      <YearWiseStudents />
    </AppHeader>
  }
/>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;