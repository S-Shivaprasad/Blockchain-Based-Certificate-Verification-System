import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, FileCheck, Database, QrCode } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">

      {/* NAVBAR */}
      <header className="border-b border-white/10 backdrop-blur bg-black/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

          <h1 className="text-xl font-bold text-green-400">
            Blockchain Certificate Network
          </h1>

          <div className="flex gap-4">
            <Link
              to="/login"
              className="px-6 py-2 rounded-lg bg-green-500 text-black font-semibold hover:bg-green-400 transition"
            >
              Login
            </Link>
          </div>

        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">

        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >

          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
            Verify Academic Certificates
            <br />
            <span className="text-green-400">
              On Blockchain
            </span>
          </h2>

          <p className="text-gray-300 mb-8 text-lg">
            A decentralized platform where colleges issue certificates,
            boards approve them, and anyone can verify authenticity instantly
            using blockchain & IPFS.
          </p>

          <div className="flex gap-4">

            <Link
              to="/login"
              className="px-6 py-3 rounded-xl bg-green-500 text-black font-semibold hover:bg-green-400 transition"
            >
              Get Started
            </Link>

            <a
              href="#features"
              className="px-6 py-3 rounded-xl border border-white/20 hover:bg-white/10 transition"
            >
              Learn More
            </a>

          </div>

        </motion.div>

        {/* RIGHT */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center"
        >
          <img
            src="/blockchain-certificate.png"
            alt="Blockchain"
            className="w-full max-w-md rounded-2xl shadow-2xl hover:scale-105 transition duration-500"
          />
        </motion.div>

      </section>


      {/* STATS */}
      <section className="py-16 border-t border-white/10 bg-black/30">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-center">

          <div>
            <h3 className="text-3xl font-bold text-green-400">100%</h3>
            <p className="text-gray-400">Tamper Proof Certificates</p>
          </div>

          <div>
            <h3 className="text-3xl font-bold text-green-400">Instant</h3>
            <p className="text-gray-400">Verification</p>
          </div>

          <div>
            <h3 className="text-3xl font-bold text-green-400">Secure</h3>
            <p className="text-gray-400">Blockchain Storage</p>
          </div>

        </div>
      </section>



      {/* FEATURES */}
      <section id="features" className="py-20 max-w-6xl mx-auto px-6">

        <h3 className="text-3xl font-bold text-green-400 text-center mb-14">
          Platform Features
        </h3>

        <div className="grid md:grid-cols-4 gap-6">

          <FeatureCard
            icon={<Database />}
            title="IPFS Storage"
            desc="Certificates securely stored on decentralized IPFS"
          />

          <FeatureCard
            icon={<ShieldCheck />}
            title="Blockchain Security"
            desc="Immutable records secured on Ethereum"
          />

          <FeatureCard
            icon={<FileCheck />}
            title="Authority Approval"
            desc="Board verifies before issuance"
          />

          <FeatureCard
            icon={<QrCode />}
            title="QR Verification"
            desc="Instant verification using QR code"
          />

        </div>

      </section>


      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="bg-black/40 border-t border-white/10 py-20"
      >

        <div className="max-w-6xl mx-auto px-6 text-center">

          <h3 className="text-3xl font-bold text-green-400 mb-12">
            How It Works
          </h3>

          <div className="grid md:grid-cols-4 gap-6">

            <StepCard
              title="College"
              desc="Uploads certificate to IPFS"
            />

            <StepCard
              title="Board"
              desc="Verifies & issues on blockchain"
            />

            <StepCard
              title="Student"
              desc="Access certificates securely"
            />

            <StepCard
              title="Verifier"
              desc="Scan QR & verify instantly"
            />

          </div>

        </div>

      </section>



      {/* CTA */}
      <section className="py-20 text-center border-t border-white/10">

        <h3 className="text-3xl font-bold mb-4">
          Ready to Issue Blockchain Certificates?
        </h3>

        <p className="text-gray-400 mb-6">
          Join the decentralized academic verification network
        </p>

        <Link
          to="/login"
          className="px-8 py-3 rounded-xl bg-green-500 text-black font-semibold hover:bg-green-400 transition"
        >
          Get Started Now
        </Link>

      </section>



      {/* FOOTER */}
      <footer className="text-center text-sm text-gray-500 py-8 border-t border-white/10">
        <p>
          © {new Date().getFullYear()} Blockchain Certificate Network
        </p>

        <p className="mt-2">
          Built with Ethereum • IPFS • Smart Contracts
        </p>

      </footer>

    </div>
  );
}



function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-black/40 hover:bg-gray-900 transition hover:scale-105">

      <div className="text-green-400 mb-4">
        {icon}
      </div>

      <h4 className="font-semibold mb-2">
        {title}
      </h4>

      <p className="text-gray-400 text-sm">
        {desc}
      </p>

    </div>
  );
}


function StepCard({ title, desc }) {
  return (
    <div className="p-6 border border-white/10 rounded-2xl hover:bg-gray-800 transition">

      <h4 className="font-semibold text-green-400 mb-2">
        {title}
      </h4>

      <p className="text-gray-400 text-sm">
        {desc}
      </p>

    </div>
  );
}