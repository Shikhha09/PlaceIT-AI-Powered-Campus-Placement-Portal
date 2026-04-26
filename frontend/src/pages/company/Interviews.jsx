import { useEffect, useState } from "react";
import { interviewsAPI } from "../../api";
import Navbar from "../../components/Navbar";
import { StatusBadge, Spinner, EmptyState } from "../../components/common";
import toast from "react-hot-toast";

export default function CompanyInterviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    interviewsAPI.getCompanyInterviews()
      .then((res) => setInterviews(res.data.interviews || []))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (id, status) => {
    try {
      await interviewsAPI.update(id, { status });
      setInterviews((prev) => prev.map((i) => i._id === id ? { ...i, status } : i));
      toast.success("Interview updated.");
    } catch { toast.error("Update failed."); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950"><Navbar /><div className="flex justify-center py-20"><Spinner /></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Scheduled Interviews</h1>

        {interviews.length === 0 ? (
          <EmptyState icon="📅" title="No interviews scheduled" description="Shortlist candidates and schedule interviews from the Applicants page." />
        ) : (
          <div className="space-y-4">
            {interviews.map((iv) => (
              <div key={iv._id} className="card">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{iv.student?.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{iv.student?.email} • {iv.student?.branch} • CGPA {iv.student?.cgpa}</p>
                    <p className="text-sm text-primary-600 mt-1">{iv.job?.title}</p>
                  </div>
                  <StatusBadge status={iv.status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Date & Time</p>
                    <p className="font-medium">{new Date(iv.scheduledAt).toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Mode</p>
                    <p className="font-medium capitalize">{iv.mode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Round</p>
                    <p className="font-medium capitalize">{iv.round}</p>
                  </div>
                  {iv.meetLink && (
                    <div>
                      <p className="text-xs text-gray-400">Meet Link</p>
                      <a href={iv.meetLink} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-xs hover:underline">Join Meeting</a>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                  {iv.status === "scheduled" && (
                    <>
                      <button onClick={() => handleUpdate(iv._id, "completed")} className="btn-primary text-xs py-1">Mark Completed</button>
                      <button onClick={() => handleUpdate(iv._id, "cancelled")} className="btn-secondary text-xs py-1">Cancel</button>
                    </>
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
