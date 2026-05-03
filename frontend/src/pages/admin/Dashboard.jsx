import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminAPI } from "../../api";
import Navbar from "../../components/Navbar";
import { StatCard, Spinner } from "../../components/common";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, PieChart, Pie, Cell, Legend,
} from "recharts";

const FUNNEL_COLORS = ["#3b82f6","#8b5cf6","#f59e0b","#a855f7","#22c55e"];
const PIE_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.analytics()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950"><Navbar /><div className="flex justify-center py-20"><Spinner /></div></div>;

  const funnelData = data ? [
    { name: "Applied", value: data.funnel.applied },
    { name: "Under Review", value: data.funnel.under_review },
    { name: "Shortlisted", value: data.funnel.shortlisted },
    { name: "Interviewed", value: data.funnel.interviewed },
    { name: "Offered", value: data.funnel.offered },
  ] : [];

  const pieData = data?.branchStats?.map((b) => ({ name: b._id || "Unknown", value: b.placed })) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Link to="/admin/approvals" className="btn-secondary text-sm">Pending Approvals</Link>
            <Link to="/admin/users" className="btn-secondary text-sm">Manage Users</Link>
          </div>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Students" value={data?.overview.totalStudents} icon="🎓" color="blue" />
          <StatCard title="Companies" value={data?.overview.totalCompanies} icon="🏢" color="purple" />
          <StatCard title="Active Jobs" value={data?.overview.totalJobs} icon="💼" color="green" />
          <StatCard title="Applications" value={data?.overview.totalApplications} icon="📋" color="orange" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Placement Funnel */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Placement Funnel</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funnelData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {funnelData.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Branch-wise placements */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Placements by Branch</h2>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No offers yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Offers by company */}
        {data?.offersByCompany?.length > 0 && (
          <div className="card mb-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Offers by Company</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.offersByCompany}>
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="offers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <Link to="/admin/analytics" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">View full log</Link>
          </div>
          <div className="space-y-2">
            {data?.recentActivity?.map((log) => (
              <div key={log._id} className="flex items-center gap-3 py-2 border-b border-gray-50 text-sm">
                <span className="text-gray-400 text-xs w-28 shrink-0">{new Date(log.createdAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
                <span className={`badge shrink-0 ${log.actorRole === "admin" ? "bg-purple-100 text-purple-700" : log.actorRole === "company" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                  {log.actorRole}
                </span>
                <span className="text-gray-700 dark:text-gray-300 truncate"><strong>{log.actor?.name}</strong> — {log.action.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
