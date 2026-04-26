import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jobsAPI, applicationsAPI } from "../../api";
import Navbar from "../../components/Navbar";
import { StatCard, Spinner } from "../../components/common";
import { useAuth } from "../../context/AuthContext";
import { Plus, Users, Briefcase, Eye } from "lucide-react";

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobsAPI.getMyJobs()
      .then((res) => setJobs(res.data.jobs || []))
      .finally(() => setLoading(false));
  }, []);

  const totalApplicants = jobs.reduce((sum, j) => sum + (j.applicantCount || 0), 0);
  const activeJobs = jobs.filter((j) => j.isActive).length;

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950"><Navbar /><div className="flex justify-center py-20"><Spinner /></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome, {user?.companyName}!</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your job postings and applicants</p>
          </div>
          <Link to="/company/post-job" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Post Job
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard title="Total Jobs Posted" value={jobs.length} icon={<Briefcase size={20} />} color="blue" />
          <StatCard title="Active Jobs" value={activeJobs} icon="✅" color="green" />
          <StatCard title="Total Applicants" value={totalApplicants} icon={<Users size={20} />} color="purple" />
        </div>

        {/* Jobs table */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Your Job Postings</h2>
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No jobs posted yet.</p>
              <Link to="/company/post-job" className="btn-primary">Post Your First Job</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700/50">
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Title</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Type</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Applicants</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Deadline</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job._id} className="border-b border-gray-50 hover:bg-gray-50 dark:bg-gray-800/50">
                      <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{job.title}</td>
                      <td className="py-3 px-2 text-gray-500 capitalize">{job.jobType}</td>
                      <td className="py-3 px-2 text-gray-900 dark:text-white">{job.applicantCount}</td>
                      <td className="py-3 px-2 text-gray-500 dark:text-gray-400">{new Date(job.deadline).toLocaleDateString("en-IN")}</td>
                      <td className="py-3 px-2">
                        <span className={`badge ${job.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 dark:text-gray-400"}`}>
                          {job.isActive ? "Active" : "Closed"}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <Link to={`/company/applicants/${job._id}`} className="flex items-center gap-1 text-primary-600 hover:underline text-xs">
                          <Eye size={12} /> View Applicants
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
