import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { applicationsAPI, aiAPI, interviewsAPI } from "../../api";
import Navbar from "../../components/Navbar";
import Pagination from "../../components/Pagination";
import { StatusBadge, ScoreBar, Spinner, EmptyState } from "../../components/common";
import toast from "react-hot-toast";
import { Zap, ExternalLink, Calendar } from "lucide-react";

const PER_PAGE = 10;

export default function Applicants() {
  const { jobId } = useParams();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shortlisting, setShortlisting] = useState(false);
  const [scheduling, setScheduling] = useState(null);
  const [interviewForm, setInterviewForm] = useState(null);
  const [page, setPage] = useState(1);
  const [statusUpdating, setStatusUpdating] = useState(null);

  const fetchApplicants = async () => {
    try {
      const res = await applicationsAPI.getForJob(jobId);
      setApplications(res.data.applications || []);
    } catch { toast.error("Failed to load applicants."); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchApplicants(); }, [jobId]);

  const handleAIShortlist = async () => {
    setShortlisting(true);
    try {
      const res = await aiAPI.shortlist(jobId);
      if (res.data.usedFallback) {
        toast(`⚠️ AI service is warming up — ranked by CGPA + skills instead. Try again in 1 minute for full AI scores.`,
          { duration: 6000, icon: "⚡" });
      } else {
        toast.success(`AI ranked ${res.data.ranked.length} candidates!`);
      }
      fetchApplicants();
    } catch (err) {
      toast.error(err.response?.data?.error || "Shortlisting failed.");
    } finally {
      setShortlisting(false);
    }
  };

  const handleStatusChange = async (appId, status) => {
    setStatusUpdating(appId);
    try {
      await applicationsAPI.updateStatus(appId, status);
      setApplications((prev) => prev.map((a) => a._id === appId ? { ...a, status } : a));
      toast.success(`Status updated to ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed.");
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setScheduling(interviewForm);
    try {
      await interviewsAPI.schedule({
        applicationId: interviewForm,
        scheduledAt: fd.get("scheduledAt"),
        mode: fd.get("mode"),
        meetLink: fd.get("meetLink"),
        venue: fd.get("venue"),
        round: fd.get("round"),
      });
      toast.success("Interview scheduled!");
      setInterviewForm(null);
      fetchApplicants();
    } catch (err) {
      toast.error(err.response?.data?.error || "Schedule failed.");
    } finally {
      setScheduling(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950"><Navbar /><div className="flex justify-center py-20"><Spinner /></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applicants</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{applications.length} applications received</p>
          </div>
          <button onClick={handleAIShortlist} disabled={shortlisting} className="btn-primary flex items-center gap-2">
            <Zap size={16} />
            {shortlisting ? "Ranking..." : "AI Shortlist"}
          </button>
        </div>

        {applications.length === 0 ? (
          <EmptyState icon="👥" title="No applicants yet" description="Share the job link to get applications." />
        ) : (
          <>
            <div className="space-y-4">
            {applications.slice((page-1)*PER_PAGE, page*PER_PAGE).map((app, idx) => (
              <div key={app._id} className="card">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-semibold shrink-0">
                      {app.aiScore !== null && app.aiScore !== undefined ? `#${idx + 1}` : app.student?.name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{app.student?.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{app.student?.email}</p>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{app.student?.branch}</span>
                        <span>CGPA: {app.student?.cgpa}</span>
                        <span>{app.student?.experience}mo exp</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {app.student?.resumeUrl && (
                      <a href={app.student.resumeUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                        <ExternalLink size={12} /> Resume
                      </a>
                    )}
                    <StatusBadge status={app.status} />
                  </div>
                </div>

                {/* AI Score breakdown */}
                {app.aiScore !== null && app.aiScore !== undefined && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg space-y-2">
                    <ScoreBar score={app.aiScore} label="Overall AI Score" />
                    {app.aiBreakdown && (
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        <ScoreBar score={app.aiBreakdown.skillMatch} label="Skill Match" />
                        <ScoreBar score={app.aiBreakdown.cgpaScore} label="CGPA Score" />
                        <ScoreBar score={app.aiBreakdown.mlConfidence} label="ML Confidence" />
                      </div>
                    )}
                  </div>
                )}

                {/* Skills */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {app.student?.skills?.slice(0, 6).map((s) => (
                    <span key={s} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                  <select
                    value={app.status}
                    onChange={(e) => handleStatusChange(app._id, e.target.value)}
                    disabled={statusUpdating === app._id}
                    className="input w-auto text-xs py-1 disabled:opacity-60"
                  >
                    {["applied","under_review","shortlisted","interviewed","offered","rejected"].map((s) => (
                      <option key={s} value={s}>{s.replace("_"," ").toUpperCase()}</option>
                    ))}
                  </select>
                  {statusUpdating === app._id && (
                    <span className="text-xs text-gray-400 animate-pulse">Updating...</span>
                  )}

                  {["shortlisted", "interviewed"].includes(app.status) && (
                    <button onClick={() => setInterviewForm(app._id)}
                      className="btn-secondary text-xs py-1 flex items-center gap-1">
                      <Calendar size={12} /> Schedule Interview
                    </button>
                  )}
                </div>

                {/* Interview scheduler inline form */}
                {interviewForm === app._id && (
                  <form onSubmit={handleScheduleInterview} className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg space-y-3">
                    <h4 className="font-medium text-sm text-gray-800 dark:text-gray-200">Schedule Interview</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Date & Time</label>
                        <input name="scheduledAt" type="datetime-local" required className="input text-xs" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Mode</label>
                        <select name="mode" className="input text-xs">
                          <option value="online">Online</option>
                          <option value="offline">Offline</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Meet Link (if online)</label>
                        <input name="meetLink" type="url" className="input text-xs" placeholder="https://meet.google.com/..." />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Venue (if offline)</label>
                        <input name="venue" className="input text-xs" placeholder="Conference Room A" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Round</label>
                        <select name="round" className="input text-xs">
                          <option value="aptitude">Aptitude</option>
                          <option value="technical">Technical</option>
                          <option value="hr">HR</option>
                          <option value="final">Final</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={scheduling === app._id} className="btn-primary text-xs py-1.5">
                        {scheduling === app._id ? "Scheduling..." : "Confirm Schedule"}
                      </button>
                      <button type="button" onClick={() => setInterviewForm(null)} className="btn-secondary text-xs py-1.5">Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            ))}
            </div>
            <Pagination page={page} totalPages={Math.ceil(applications.length/PER_PAGE)} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
