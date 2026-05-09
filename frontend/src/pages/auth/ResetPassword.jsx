import { useParams } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

export default function ResetPassword() {

  const { token } = useParams();   // gets token from URL
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  /* 🔹 ADD API CALL HERE */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {

      await axios.post("http://localhost:5000/auth/reset-password", {
        token,
        newPassword
      });

      setMessage("Password reset successful");

    } catch (err) {

      setMessage(
        err.response?.data?.message || "Reset failed"
      );

    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-black text-white">

      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-8 rounded-xl w-96"
      >
        <h2 className="text-xl mb-6 text-green-400">
          Reset Password
        </h2>

        <input
          type="password"
          placeholder="New Password"
          className="w-full p-2 mb-4 bg-black border border-green-500 rounded"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <button
          className="w-full bg-green-600 hover:bg-green-500 p-2 rounded"
        >
          Reset Password
        </button>

        {message && (
          <p className="mt-4 text-green-400">
            {message}
          </p>
        )}

      </form>

    </div>
  );
}