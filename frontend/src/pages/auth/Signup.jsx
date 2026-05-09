import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ethers } from "ethers";
import { Wallet } from "lucide-react";

export default function Signup() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wallet, setWallet] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  /* ================= CHECK WALLET ================= */
  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();

      if (accounts.length > 0) {
        setWallet(accounts[0].address || accounts[0]);
        setWalletConnected(true);
      }
    }
  };

  /* ================= CONNECT WALLET ================= */
  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      setWallet(accounts[0]);
      setWalletConnected(true);

    } catch {
      alert("Wallet connection failed");
    }
  };

  /* ================= SIGNUP ================= */
  const handleSignup = async () => {

    if (!email || !password || !wallet || !role) {
      alert("Please fill all fields");
      return;
    }

    /* EMAIL VALIDATION */
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      alert("Please enter valid email");
      return;
    }

    /* PASSWORD VALIDATION */
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!passwordRegex.test(password)) {
      alert(
        "Password must be 8 chars with uppercase lowercase number"
      );
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(
        "http://localhost:5000/auth/signup",
        {
          email: email.trim(),
          password,
          wallet: wallet.toLowerCase(),
          role,
        }
      );

      alert(res.data.message || "Signup successful");
      navigate("/login");

    } catch (err) {
      alert(
        err.response?.data?.message ||
        "Signup failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0f172a] to-[#020617] flex items-center justify-center px-4">

      <div className="w-full max-w-md bg-[#0b1220] border border-green-500/20 rounded-xl shadow-2xl p-8">

        <h2 className="text-3xl font-bold text-white text-center mb-2">
          Create Account on
          <span className="text-green-400">
            {" "}Blockchain Network
          </span>
        </h2>

        <p className="text-gray-400 text-center mb-8">
          Register securely using wallet
        </p>

        {/* Wallet Connect */}
        <div className="mb-4">
          <button
            onClick={connectWallet}
            className={`w-full py-3 rounded-lg border flex items-center justify-center gap-2
              ${walletConnected
                ? "border-green-500 text-green-400"
                : "border-gray-600 text-gray-300"
              }`}
          >
            <Wallet size={18} />

            {walletConnected
              ? `${wallet.slice(0,6)}...${wallet.slice(-4)}`
              : "Connect Wallet"}
          </button>
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="text-gray-300 text-sm block mb-2">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg
            bg-[#111827] text-white border border-gray-700"
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="text-gray-300 text-sm block mb-2">
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg
            bg-[#111827] text-white border border-gray-700"
          />
        </div>

        {/* Role */}
        <div className="mb-6">
          <label className="text-gray-300 text-sm block mb-2">
            Role
          </label>

          <select
            value={role}
            onChange={(e)=>setRole(e.target.value)}
            className="w-full px-4 py-3 rounded-lg
            bg-[#111827] text-white border border-gray-700"
          >
            <option value="board">Board</option>
            <option value="hei">HEI</option>
            <option value="student">Student</option>
            <option value="verifier">Verifier</option>
          </select>
        </div>

        {/* Signup */}
        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full py-3 rounded-lg
          bg-green-500 hover:bg-green-400
          text-black font-semibold"
        >
          {loading ? "Creating..." : "Sign Up"}
        </button>

        <p className="text-gray-400 text-sm mt-6 text-center">
          Already have account?{" "}
          <span
            className="text-green-400 cursor-pointer"
            onClick={()=>navigate("/login")}
          >
            Login
          </span>
        </p>

      </div>
    </div>
  );
}