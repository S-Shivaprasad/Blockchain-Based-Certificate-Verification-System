import { Outlet, useNavigate } from "react-router-dom";

export default function ProtectedLayout({ user, account, logout }) {
  const navigate = useNavigate();

  if (!user || !account) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100">
      
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-green-500/20 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          
          {/* Brand */}
          <div>
            <h1 className="text-2xl font-bold text-green-400">
              Blockchain Certificate Network
            </h1>
            <p className="text-sm text-gray-400">
              Secure • Trustless • On-Chain
            </p>
          </div>

          {/* User Info */}
          <div className="flex gap-3 items-center">
            <span className="text-xs font-semibold bg-green-500/20 text-green-400 px-3 py-1 rounded-full uppercase">
              {user.role}
            </span>

            <span className="text-xs font-mono bg-gray-800/50 px-3 py-1 rounded-full">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>

            <button
              onClick={() => {
                logout();
                navigate("/", { replace: true });
              }}
              className="text-xs font-semibold bg-red-600 hover:bg-red-500 transition-colors px-3 py-1 rounded-full"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
