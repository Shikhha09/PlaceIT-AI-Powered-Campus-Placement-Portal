import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { authAPI } from "../api";
import { Zap, CheckCircle, XCircle, Loader } from "lucide-react";

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    authAPI.verifyEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.error || "Verification failed.");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-blue-800
                    dark:from-gray-950 dark:via-gray-900 dark:to-gray-950
                    flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap size={32} className="text-primary-600 fill-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">Place<span className="text-blue-300">IT</span></h1>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 text-center border border-transparent dark:border-gray-700/50">
          {status === "loading" && (
            <>
              <Loader size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Verifying your email...</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Please wait a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Email Verified! ✅</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
              <Link to="/login" className="btn-primary">Go to Sign In</Link>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle size={48} className="text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Verification Failed</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
              <Link to="/register" className="btn-primary">Register Again</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
