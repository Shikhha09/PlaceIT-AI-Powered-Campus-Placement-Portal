import { useEffect, useState } from "react";
import { authAPI } from "../../api";
import Navbar from "../../components/Navbar";
import { Spinner, EmptyState } from "../../components/common";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, User, Building2 } from "lucide-react";

export default function AdminApprovals() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(null);

  const fetchPending = () => {
    setLoading(true);
    authAPI
      .pending()
      .then((res) => {
        setPending(res.data.pending || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Failed to load pending approvals");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handle = async (id, action) => {
    setActing(id + action);
    try {
      await authAPI.approve(id, action);
      toast.success(action === "approve" ? "✅ User approved successfully!" : "❌ User rejected.");
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.error || "Action failed. Please try again.");
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-red-500 font-medium text-lg mb-2">Error loading approvals</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button onClick={fetchPending} className="btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Approvals</h1>
            <p className="text-gray-500 text-sm mt-1">
              {pending.length} user{pending.length !== 1 ? "s" : ""} waiting for approval
            </p>
          </div>
          <button onClick={fetchPending} className="btn-secondary text-sm">Refresh</button>
        </div>

        {pending.length === 0 ? (
          <EmptyState
            icon="✅"
            title="All caught up!"
            description="No pending approvals right now. New registrations will appear here."
          />
        ) : (
          <div className="space-y-4">
            {pending.map((u) => (
              <div key={u._id} className="card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      u.role === "company" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                    }`}>
                      {u.role === "company" ? <Building2 size={22} /> : <User size={22} />}
                    </div>

                    {/* Info */}
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{u.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`badge ${
                          u.role === "company"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {u.role.toUpperCase()}
                        </span>
                        {u.branch && (
                          <span className="badge bg-gray-100 text-gray-700 dark:text-gray-300">
                            {u.branch}
                          </span>
                        )}
                        {u.cgpa && (
                          <span className="badge bg-yellow-100 text-yellow-700">
                            CGPA: {u.cgpa}
                          </span>
                        )}
                        {u.companyName && (
                          <span className="badge bg-purple-100 text-purple-700">
                            {u.companyName}
                          </span>
                        )}
                        {u.graduationYear && (
                          <span className="badge bg-gray-100 text-gray-600 dark:text-gray-400">
                            Batch {u.graduationYear}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Registered: {new Date(u.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handle(u._id, "approve")}
                      disabled={!!acting}
                      className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={15} />
                      {acting === u._id + "approve" ? "Approving..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handle(u._id, "reject")}
                      disabled={!!acting}
                      className="flex items-center gap-1.5 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={15} />
                      {acting === u._id + "reject" ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
