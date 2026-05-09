import { useState } from "react";
import axios from "axios";

export default function ForgotPassword() {

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {

      const res = await axios.post(
        "http://localhost:5000/auth/forgot-password",
        { email }
      );

      setMessage(res.data.message);

   } catch (err) {

  console.error("FORGOT PASSWORD ERROR:", err);

  res.status(500).json({
    message: err.message,
    stack: err.stack
  });

   }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-black text-white">
      
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-8 rounded-xl w-96"
      >
        <h2 className="text-xl mb-6 text-green-400">
          Forgot Password
        </h2>

        <input
          type="email"
          placeholder="Enter email"
          className="w-full p-2 mb-4 bg-black border border-green-500 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          className="w-full bg-green-600 hover:bg-green-500 p-2 rounded"
        >
          Send Reset Link
        </button>

        {message && (
          <p className="mt-4 text-sm text-green-400">
            {message}
          </p>
        )}

      </form>

    </div>
  );
}