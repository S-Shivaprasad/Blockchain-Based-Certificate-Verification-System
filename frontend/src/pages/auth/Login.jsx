import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { Eye, EyeOff, Wallet, Loader2 } from "lucide-react";
import { ethers } from "ethers";
import { motion } from "framer-motion";

export default function Login({ setUser }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();

      if (accounts.length > 0) {
        setWalletConnected(true);
        setWalletAddress(accounts[0].address);
      }
    }
  };

  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      setWalletConnected(true);
      setWalletAddress(accounts[0]);

    } catch {
      setError("Wallet connection failed");
    }
  };

 const login = async () => {
  if (!email || !password) {
    setError("Email and password are required");
    return;
  }

  if (!walletConnected) {
    setError("Please connect wallet first");
    return;
  }

  try {
    setLoading(true);
    setError("");

    const res = await axios.post("http://localhost:5000/auth/login", {
      email: email.trim(),
      password,
      wallet: walletAddress
    });

    const token = res.data.token;

    /* SAVE TOKEN */
    localStorage.setItem("btcnv_token", token);

    /* SAVE WALLET (IMPORTANT FIX) */
    localStorage.setItem("wallet", walletAddress.toLowerCase());

    const decoded = jwtDecode(token);

    setUser(decoded);

    navigate("/app", { replace: true });

  } catch (err) {
    setError(err.response?.data?.message || "Login failed");
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#020617] to-black flex items-center justify-center px-4">

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#0b1220]/80 backdrop-blur-xl border border-green-500/20 rounded-2xl shadow-2xl p-8"
      >

        <h2 className="text-3xl font-bold text-white text-center mb-2">
          Login to <span className="text-green-400">Blockchain Network</span>
        </h2>

        <p className="text-gray-400 text-center mb-8">
          Secure Web3 Certificate Dashboard
        </p>

        {/* Wallet Connect */}
        <div className="mb-6">

          <button
            onClick={connectWallet}
            className={`w-full py-3 rounded-lg border flex items-center justify-center gap-2
            ${walletConnected
                ? "border-green-500 text-green-400"
                : "border-gray-600 text-gray-300 hover:border-green-500"
              } transition`}
          >
            <Wallet size={18} />

            {walletConnected
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : "Connect Wallet"}
          </button>

        </div>

        {/* Email */}
        <div className="mb-5">
          <label className="text-gray-300 text-sm block mb-2">
            Email
          </label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[#111827]
                       text-white border border-gray-700
                       focus:outline-none focus:ring-2
                       focus:ring-green-500 transition"
          />
        </div>

        {/* Password */}
        <div className="mb-3 relative">

          <label className="text-gray-300 text-sm block mb-2">
            Password
          </label>

          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 pr-12 rounded-lg
                       bg-[#111827] text-white border
                       border-gray-700 focus:outline-none
                       focus:ring-2 focus:ring-green-500"
          />

          <button
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-10 text-gray-400 hover:text-white"
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>

        </div>

        {/* Forgot */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => navigate("/forgot-password")}
            className="text-sm text-green-400 hover:underline"
          >
            Forgot Password?
          </button>
        </div>

        {/* Login Button */}
        <button
          onClick={login}
          disabled={loading}
          className="w-full py-3 rounded-lg font-semibold
                     text-black bg-green-500
                     hover:bg-green-400
                     flex items-center justify-center gap-2
                     transition"
        >
          {loading && <Loader2 className="animate-spin" size={18} />}
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Signup */}
        <button
          onClick={() => navigate("/signup")}
          className="w-full mt-4 py-3 rounded-lg
                     text-green-400 border border-green-500/30
                     hover:bg-green-500 hover:text-black
                     transition"
        >
          Create New Account
        </button>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5 text-red-400 text-sm text-center"
          >
            {error}
          </motion.div>
        )}

      </motion.div>

    </div>
  );
}