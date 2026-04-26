import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { jobsAPI, applicationsAPI } from "../../api";
import Navbar from "../../components/Navbar";
import { StatCard, StatusBadge, Spinner, EmptyState } from "../../components/common";
import { Briefcase, FileText, CheckCircle, Clock } from "lucide-react";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [recommended, setRecommended] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [recRes, appRes] = await Promise.all([
          jobsAPI.getRecommended(),
          applicationsAPI.getMine(),
        ]);
        setRecommended(recRes.data.jobs || []);
        setApplications(appRes.data.applications || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = {
    applied: applications.length,
    shortlisted: applications.filter((a) => ["shortlisted", "interviewed", "offered"].includes(a.status)).length,
    offered: applications.filter((a) => a.status === "offered").length,
    pending: applications.filter((a) => ["applied", "under_review"].includes(a.status)).length,
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950"><Navbar />
      <div className="flex items-center justify-center h-96"><Spinner /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.name}! 👋</h1>
          <p className="text-gray-500 mt-1">{user?.branch} • CGPA: {user?.cgpa} • Class of {user?.graduationYear}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Applied" value={stats.applied} icon={<FileText size={20} />} color="blue" />
          <StatCard title="Shortlisted" value={stats.shortlisted} icon={<CheckCircle size={20} />} color="purple" />
          <StatCard title="Offers" value={stats.offered} icon="🎉" color="green" />
          <StatCard title="Pending Review" value={stats.pending} icon={<Clock size={20} />} color="orange" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recommended Jobs */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Recommended For You</h2>
              <Link to="/student/jobs" className="text-sm text-primary-600 hover:underline">View all</Link>
            </div>
            {recommended.length === 0 ? (
              <EmptyState icon="💼" title="No recommendations yet" description="Complete your profile and add skills to get job recommendations." />
            ) : (
              <div className="space-y-3">
                {recommended.slice(0, 4).map((job) => (
                  <div key={job._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-primary-50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{job.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{job.company?.companyName} • {job.ctc}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        {job.matchPercentage}% match
                      </span>
                      <Link to={`/student/jobs`} className="btn-primary text-xs py-1 px-2">Apply</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Applications */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Recent Applications</h2>
              <Link to="/student/applications" className="text-sm text-primary-600 hover:underline">View all</Link>
            </div>
            {applications.length === 0 ? (
              <EmptyState icon="📋" title="No applications yet" description="Browse jobs and start applying!" />
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 5).map((app) => (
                  <div key={app._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{app.job?.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{app.job?.company?.companyName}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Profile completion nudge */}
        {!user?.resumeUrl && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-medium text-yellow-800">📄 Upload your resume</p>
              <p className="text-sm text-yellow-600">Companies need your resume to consider you for AI shortlisting.</p>
            </div>
            <Link to="/student/profile" className="btn-primary text-sm shrink-0 ml-4">Upload Now</Link>
          </div>
        )}
      </div>
    </div>
  );
}
