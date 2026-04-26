import { useEffect, useState } from "react";
import { applicationsAPI } from "../../api";
import Navbar from "../../components/Navbar";
import { StatusBadge, Spinner, EmptyState } from "../../components/common";
import { Link } from "react-router-dom";

const STEPS = ["applied", "under_review", "shortlisted", "interviewed", "offered"];

function PipelineBar({ status }) {
  const idx = STEPS.indexOf(status);
  const rejected = status === "rejected";
  return (
    <div className="flex items-center gap-1 mt-2">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${
            rejected ? "bg-red-300" :
            i < idx ? "bg-green-500" :
            i === idx ? "bg-primary-600" :
            "bg-gray-200"
          }`} />
          {i < STEPS.length - 1 && (
            <div className={`w-4 h-0.5 ${i < idx && !rejected ? "bg-green-500" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    applicationsAPI.getMine()
      .then((res) => setApplications(res.data.applications || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? applications : applications.filter((a) => a.status === filter);

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950"><Navbar /><div className="flex justify-center py-20"><Spinner /></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Applications</h1>
        <p className="text-gray-500 text-sm mb-6">{applications.length} total applications</p>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["all", "applied", "under_review", "shortlisted", "interviewed", "offered", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f ? "bg-primary-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800/50"
              }`}
            >
              {f.replace("_", " ").toUpperCase()}
              {f === "all" && ` (${applications.length})`}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="📋" title="No applications" description="Apply to jobs to see them here." action={<Link to="/student/jobs" className="btn-primary">Browse Jobs</Link>} />
        ) : (
          <div className="space-y-4">
            {filtered.map((app) => (
              <div key={app._id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{app.job?.title}</h3>
                    <p className="text-sm text-primary-600">{app.job?.company?.companyName}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Applied {new Date(app.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                <PipelineBar status={app.status} />

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                  <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>📍 {app.job?.location}</span>
                    <span>💰 {app.job?.ctc}</span>
                  </div>
                  {app.aiScore !== null && app.aiScore !== undefined && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      app.aiScore >= 75 ? "bg-green-100 text-green-700" :
                      app.aiScore >= 50 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      AI Score: {app.aiScore}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
