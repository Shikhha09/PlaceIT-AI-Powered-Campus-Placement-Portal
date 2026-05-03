import { useEffect, useState } from "react";
import { applicationsAPI } from "../../api";
import Navbar from "../../components/Navbar";
import { StatusBadge, Spinner, EmptyState } from "../../components/common";
import Pagination from "../../components/Pagination";
import { Link } from "react-router-dom";
import { FileText, Calendar } from "lucide-react";

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
            "bg-gray-200 dark:bg-gray-600"
          }`} />
          {i < STEPS.length - 1 && (
            <div className={`w-4 h-0.5 ${i < idx && !rejected ? "bg-green-500" : "bg-gray-200 dark:bg-gray-600"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

const PAGE_SIZE = 8;

export default function StudentApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    applicationsAPI.getMine()
      .then((res) => setApplications(res.data.applications || []))
      .finally(() => setLoading(false));
  }, []);

  // Client-side filter + pagination
  const filtered = statusFilter
    ? applications.filter((a) => a.status === statusFilter)
    : applications;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (val) => {
    setStatusFilter(val);
    setPage(1); // reset to page 1 when filter changes
  };

  const statuses = ["applied", "under_review", "shortlisted", "interviewed", "offered", "rejected"];

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="flex justify-center py-20"><Spinner /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Applications</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
              {filtered.length} application{filtered.length !== 1 ? "s" : ""}
              {statusFilter && ` · filtered by ${statusFilter.replace("_", " ")}`}
            </p>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="input w-auto text-sm"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>
            ))}
          </select>
        </div>

        {paginated.length === 0 ? (
          <EmptyState
            icon="📋"
            title={statusFilter ? "No applications with this status" : "No applications yet"}
            description="Browse jobs and start applying!"
            action={<Link to="/student/jobs" className="btn-primary text-sm">Browse Jobs</Link>}
          />
        ) : (
          <>
            <div className="space-y-4">
              {paginated.map((app) => (
                <div key={app._id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-lg">
                        {app.job?.title}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                        {app.job?.company?.companyName}
                        {app.job?.location && ` · ${app.job.location}`}
                        {app.job?.ctc && ` · ${app.job.ctc}`}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>

                  <PipelineBar status={app.status} />

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex-wrap gap-2">
                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Applied {new Date(app.createdAt).toLocaleDateString("en-IN")}
                      </span>
                      {app.aiScore !== null && app.aiScore !== undefined && (
                        <span className="flex items-center gap-1">
                          <FileText size={12} />
                          AI Score: <strong className="text-gray-700 dark:text-gray-300">{app.aiScore}/100</strong>
                        </span>
                      )}
                    </div>
                    {app.job?.requiredSkills?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {app.job.requiredSkills.slice(0, 4).map((s) => (
                          <span key={s} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

            {/* Summary */}
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
