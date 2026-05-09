import { useEffect, useState } from "react";

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

export default function ConnectWallet({ setAccount }) {
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!window.ethereum) {
      setError("MetaMask is not installed");
      return;
    }

    window.ethereum.on("accountsChanged", (accounts) => {
      setAccount(accounts.length ? accounts[0] : null);
    });

    window.ethereum.on("chainChanged", () => {
      window.location.reload();
    });
  }, [setAccount]);

  const connect = async () => {
    try {
      setError("");
      setConnecting(true);

      if (!window.ethereum) {
        setError("Please install MetaMask");
        return;
      }

      const chainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      if (chainId !== SEPOLIA_CHAIN_ID) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setAccount(accounts[0]);
    } catch (err) {
      if (err.code === 4001) {
        setError("Connection rejected by user");
      } else {
        setError(err.message);
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">

      {/* Animated neon background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-black to-green-950 animate-pulse-slow opacity-30"></div>
      <div className="absolute inset-0 pointer-events-none
        bg-[linear-gradient(to_bottom,rgba(0,255,0,0.03)_1px,transparent_1px)]
        bg-[size:100%_4px] animate-background-scroll"></div>

      <div className="relative z-10 w-[380px] rounded-2xl border border-green-500/30
        bg-black/80 backdrop-blur-xl p-8
        shadow-[0_0_40px_rgba(0,255,0,0.4)] animate-glow">

        {/* Header */}
        <h2 className="text-3xl font-bold text-center mb-2 tracking-widest text-green-400 animate-text-flicker">
          CONNECT WALLET
        </h2>
        <p className="text-center text-xs text-green-300 mb-6">
          Blockchain Certificate Network
        </p>

        {/* Connect Button */}
        <button
          onClick={connect}
          disabled={connecting}
          className="w-full py-3 rounded-xl font-semibold text-black
            bg-green-400 hover:bg-green-300
            focus:outline-none focus:ring-2 focus:ring-green-400
            shadow-[0_0_25px_rgba(0,255,0,0.6)]
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-slow"
        >
          {connecting ? "CONNECTING..." : "CONNECT METAMASK"}
        </button>

        {/* Network Info */}
        <div className="mt-4 text-center text-xs text-green-300">
          Network: <span className="font-semibold">Sepolia Testnet</span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-5 border border-red-500/40 bg-red-950/40
            text-red-400 p-3 rounded text-sm text-center animate-shake">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-[10px] text-green-500 text-center opacity-70 animate-text-flicker">
          Secure • Trustless • On-Chain Verified
        </div>
      </div>

      {/* Tailwind CSS Animations */}
      <style jsx>{`
        @keyframes background-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        .animate-background-scroll {
          animation: background-scroll 5s linear infinite;
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 40px rgba(0,255,0,0.4); }
          50% { box-shadow: 0 0 60px rgba(0,255,0,0.6); }
        }
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        @keyframes flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
          20%, 22%, 24%, 55% { opacity: 0.4; }
        }
        .animate-text-flicker {
          animation: flicker 1.5s infinite;
        }

        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          50% { transform: translateX(3px); }
          75% { transform: translateX(-3px); }
          100% { transform: translateX(0); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }

        .animate-pulse-slow {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
}
