import { useEffect, useState } from "react";
import axios from "axios";

export default function SubmittedCertificates() {

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("btcnv_token");

      const res = await axios.get(
        "http://localhost:5000/college/submitted",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setStudents(res.data.certificates);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white p-6">

      <div className="max-w-7xl mx-auto">

        <h1 className="text-2xl font-semibold mb-6">
          Submitted Certificates
        </h1>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">

          <table className="w-full">

            <thead className="bg-white/10 text-left">
              <tr>
                <th className="p-4">Student Name</th>
                <th className="p-4">Wallet</th>
                <th className="p-4">CID</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>

            <tbody>

              {loading && (
                <tr>
                  <td className="p-4">Loading...</td>
                </tr>
              )}

              {!loading && students.length === 0 && (
                <tr>
                  <td className="p-4">No Data Found</td>
                </tr>
              )}

              {students.map((s, i) => (
                <tr key={i} className="border-t border-white/10">

                  <td className="p-4">
                    {s.studentName}
                  </td>

                  <td className="p-4 text-sm text-gray-400">
                    {s.studentWallet}
                  </td>

                  <td className="p-4 text-sm text-gray-400">
                    {s.cid}
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded text-xs ${
                        s.status === "APPROVED"
                          ? "bg-green-500/20 text-green-400"
                          : s.status === "REJECTED"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}