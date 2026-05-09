import Certificates from "./Certificates";

export default function StudentDashboard() {
  return (
    <div className="min-h-screen bg-black text-white">

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-black pointer-events-none" />

      {/* Header */}
      <div className="relative bg-white/5 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
          
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Student Dashboard
            </h1>

            <p className="text-sm text-gray-400 mt-1">
              View & verify your blockchain certificates
            </p>
          </div>

        </div>
      </div>

      {/* Content */}
      <div className="relative max-w-6xl mx-auto p-6">

        {/* Glass container */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/40">
          
          <Certificates />

        </div>

      </div>
    </div>
  );
}