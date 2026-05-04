import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { jobsAPI, applicationsAPI, bookmarkAPI } from "../../api";
import Navbar from "../../components/Navbar";
import { StatusBadge, Spinner, EmptyState } from "../../components/common";
import toast from "react-hot-toast";
import { Search, MapPin, DollarSign, Clock, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck } from "lucide-react";

export default function StudentJobs() {
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);
  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState("");
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set(bookmarkAPI.getAll().map((b) => b._id)));

  const fetchJobs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await jobsAPI.getAll({ page, limit: 8, search, jobType });
      setJobs(res.data.jobs);
      setPagination(res.data.pagination);
    } catch {
      toast.error("Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  }, [search, jobType]);

  useEffect(() => { fetchJobs(1); }, [fetchJobs]);

  // Track which jobs are already applied
  useEffect(() => {
    applicationsAPI.getMine().then((res) => {
      const ids = new Set(res.data.applications.map((a) => a.job?._id));
      setAppliedIds(ids);
    }).catch(() => {});
  }, []);

  const handleApply = async (jobId) => {
    setApplying(jobId);
    try {
      await applicationsAPI.apply(jobId, "");
      setAppliedIds((prev) => new Set([...prev, jobId]));
      toast.success("Application submitted!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to apply.");
    } finally {
      setApplying(null);
    }
  };

  const handleBookmark = (job) => {
    if (bookmarkedIds.has(job._id)) {
      bookmarkAPI.remove(job._id);
      setBookmarkedIds((prev) => { const s = new Set(prev); s.delete(job._id); return s; });
      toast("Removed from saved jobs", { icon: "🔖" });
    } else {
      bookmarkAPI.add(job);
      setBookmarkedIds((prev) => new Set([...prev, job._id]));
      toast.success("Saved! View in Saved Jobs.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Available Jobs</h1>
          <p className="text-gray-500 text-sm mt-1">Showing jobs matching your eligibility</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
              placeholder="Search jobs, skills, companies..."
            />
          </div>
          <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="input w-full sm:w-40">
            <option value="">All Types</option>
            <option value="full-time">Full-Time</option>
            <option value="internship">Internship</option>
            <option value="contract">Contract</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : jobs.length === 0 ? (
          <EmptyState icon="🔍" title="No jobs found" description="Try adjusting your search or check back later." />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {jobs.map((job) => (
                <div key={job._id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                      <p className="text-sm text-primary-600 font-medium">{job.company?.companyName}</p>
                    </div>
                    <span className={`badge ${job.jobType === "internship" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {job.jobType}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1"><MapPin size={12} />{job.location}</span>
                    <span className="flex items-center gap-1"><DollarSign size={12} />{job.ctc}</span>
                    <span className="flex items-center gap-1"><Clock size={12} />Deadline: {new Date(job.deadline).toLocaleDateString("en-IN")}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {job.requiredSkills.slice(0, 4).map((s) => (
                      <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                    {job.requiredSkills.length > 4 && (
                      <span className="text-xs text-gray-400">+{job.requiredSkills.length - 4} more</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Min CGPA: <strong>{job.minCGPA}</strong></span>
                    <div className="flex gap-2">
                      <Link to={`/student/skill-gap/${job._id}`} className="btn-secondary text-xs py-1 px-3">
                        Skill Gap
                      </Link>
                      <button
                        onClick={() => handleBookmark(job)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          bookmarkedIds.has(job._id)
                            ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20"
                            : "text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                        title={bookmarkedIds.has(job._id) ? "Remove bookmark" : "Save job"}
                      >
                        {bookmarkedIds.has(job._id)
                          ? <BookmarkCheck size={16} />
                          : <Bookmark size={16} />
                        }
                      </button>
                      {appliedIds.has(job._id) ? (
                        <span className="badge bg-green-100 text-green-700">Applied ✓</span>
                      ) : (
                        <button
                          onClick={() => handleApply(job._id)}
                          disabled={applying === job._id}
                          className="btn-primary text-xs py-1 px-3"
                        >
                          {applying === job._id ? "Applying..." : "Apply"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => fetchJobs(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="btn-secondary p-2 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => fetchJobs(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="btn-secondary p-2 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
