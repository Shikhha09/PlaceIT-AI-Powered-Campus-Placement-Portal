import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobsAPI, applicationsAPI } from "../../api";
import Navbar from "../../components/Navbar";
import { StatCard, Spinner, StatusBadge } from "../../components/common";
import { useAuth } from "../../context/AuthContext";
import { Plus, Users, Briefcase, Eye, Trophy, Clock, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#3b82f6","#10b981","#8b5cf6","#f59e0b","#ef4444","#6366f1"];

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const jobRes = await jobsAPI.getMyJobs();
        const myJobs = jobRes.data.jobs || [];
        setJobs(myJobs);

        // Load applications for all jobs
        const appPromises = myJobs.map((j) =>
          applicationsAPI.getForJob(j._id).then((r) => r.data.applications || []).catch(() => [])
        );
        const allApps = (await Promise.all(appPromises)).flat();
        setAllApplications(allApps);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const totalApplicants = jobs.reduce((s, j) => s + (j.applicantCount || 0), 0);
  const activeJobs = jobs.filter((j) => j.isActive).length;
  const offers = allApplications.filter((a) => a.status === "offered").length;
  const shortlisted = allApplications.filter((a) => ["shortlisted","interviewed","offered"].includes(a.status)).length;

  // Status distribution for pie chart
  const statusCounts = {};
  allApplications.forEach((a) => {
    statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
  });
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace("_"," "), value }));

  // Applicants per job for bar chart
  const barData = jobs.slice(0, 6).map((j) => ({
    name: j.title.length > 15 ? j.title.slice(0,15) + "…" : j.title,
    applicants: j.applicantCount || 0,
  }));

  // Recent applications across all jobs
  const recentApps = [...allApplications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar /><div className="flex justify-center py-20"><Spinner /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome, {user?.companyName}! 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Here's your hiring overview
            </p>
          </div>
          <Link to="/company/post-job" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Post Job
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Jobs Posted"     value={jobs.length}      icon={<Briefcase size={20}/>} color="blue"   />
          <StatCard title="Active Jobs"     value={activeJobs}       icon={<TrendingUp size={20}/>} color="green"  />
          <StatCard title="Total Applicants" value={totalApplicants} icon={<Users size={20}/>}     color="purple" />
          <StatCard title="Offers Made"     value={offers}           icon={<Trophy size={20}/>}    color="orange" />
        </div>

        {/* Charts row */}
        {allApplications.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

            {/* Applicants per job */}
            {barData.length > 0 && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Applicants per Job</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="applicants" fill="#3b82f6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Status breakdown */}
            {pieData.length > 0 && (
              <div className="card">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Application Status Breakdown</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Jobs table */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Your Job Postings</h2>
            {jobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No jobs posted yet.</p>
                <Link to="/company/post-job" className="btn-primary text-sm">Post Your First Job</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div key={job._id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="min-w-0 mr-3">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{job.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {job.applicantCount} applicants · {job.jobType}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge text-xs ${job.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                        {job.isActive ? "Active" : "Closed"}
                      </span>
                      <Link to={`/company/applicants/${job._id}`}
                        className="text-primary-600 dark:text-primary-400 hover:underline">
                        <Eye size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Applications */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Applications</h2>
            {recentApps.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                No applications yet. Post jobs to start receiving them.
              </p>
            ) : (
              <div className="space-y-3">
                {recentApps.map((app) => (
                  <div key={app._id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="min-w-0 mr-3">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {app.student?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {app.job?.title} · {app.student?.branch} · CGPA {app.student?.cgpa}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {app.aiScore !== null && app.aiScore !== undefined && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          app.aiScore >= 75 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          app.aiScore >= 50 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {app.aiScore}
                        </span>
                      )}
                      <StatusBadge status={app.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
