import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { bookmarkAPI, applicationsAPI } from "../../api";
import Navbar from "../../components/Navbar";
import { EmptyState, StatusBadge } from "../../components/common";
import { Bookmark, MapPin, Clock, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export default function SavedJobs() {
  const [bookmarks, setBookmarks] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [applying, setApplying] = useState(null);

  useEffect(() => {
    setBookmarks(bookmarkAPI.getAll());
    applicationsAPI.getMine()
      .then((res) => {
        const ids = new Set((res.data.applications || []).map((a) => a.job?._id || a.job));
        setAppliedIds(ids);
      })
      .catch(() => {});
  }, []);

  const handleRemove = (jobId) => {
    bookmarkAPI.remove(jobId);
    setBookmarks((prev) => prev.filter((b) => b._id !== jobId));
    toast.success("Removed from saved jobs");
  };

  const handleApply = async (jobId) => {
    setApplying(jobId);
    try {
      await applicationsAPI.apply({ jobId });
      setAppliedIds((prev) => new Set([...prev, jobId]));
      toast.success("Application submitted!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Application failed.");
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bookmark size={24} className="text-primary-600" />
              Saved Jobs
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {bookmarks.length} saved {bookmarks.length === 1 ? "job" : "jobs"}
            </p>
          </div>
          {bookmarks.length > 0 && (
            <button
              onClick={() => {
                localStorage.removeItem("placeit_bookmarks");
                setBookmarks([]);
                toast.success("All saved jobs cleared");
              }}
              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 flex items-center gap-1"
            >
              <Trash2 size={14} /> Clear all
            </button>
          )}
        </div>

        {bookmarks.length === 0 ? (
          <EmptyState
            icon="🔖"
            title="No saved jobs yet"
            description="Bookmark jobs from the Jobs page to save them here for later."
            action={<Link to="/student/jobs" className="btn-primary">Browse Jobs</Link>}
          />
        ) : (
          <div className="space-y-4">
            {bookmarks.map((job) => {
              const isApplied = appliedIds.has(job._id);
              const isExpired = new Date(job.deadline) < new Date();
              const daysLeft = Math.ceil((new Date(job.deadline) - new Date()) / (1000*60*60*24));

              return (
                <div key={job._id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                        <span className={`badge text-xs capitalize ${
                          job.jobType === "full-time"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : job.jobType === "internship"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}>
                          {job.jobType}
                        </span>
                      </div>
                      <p className="text-sm text-primary-600 dark:text-primary-400 mt-0.5">
                        {job.company?.companyName}
                      </p>

                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {job.location}
                        </span>
                        <span>💰 {job.ctc}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {isExpired ? (
                            <span className="text-red-500">Expired</span>
                          ) : (
                            <span className={daysLeft <= 3 ? "text-red-500 font-medium" : daysLeft <= 7 ? "text-yellow-600" : ""}>
                              {daysLeft}d left
                            </span>
                          )}
                        </span>
                        <span>Min CGPA: {job.minCGPA}</span>
                      </div>

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {(job.requiredSkills || []).slice(0, 5).map((s) => (
                          <span key={s} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleRemove(job._id)}
                        className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove bookmark"
                      >
                        <Bookmark size={16} className="fill-current" />
                      </button>
                    </div>
                  </div>

                  {/* Apply button */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex justify-end">
                    {isExpired ? (
                      <span className="text-xs text-gray-400 dark:text-gray-500">Applications closed</span>
                    ) : isApplied ? (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Already applied</span>
                    ) : (
                      <button
                        onClick={() => handleApply(job._id)}
                        disabled={applying === job._id}
                        className="btn-primary text-sm py-1.5 px-4"
                      >
                        {applying === job._id ? "Applying..." : "Apply Now"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
