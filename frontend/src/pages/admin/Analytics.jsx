import { useEffect, useState } from "react";
import { adminAPI } from "../../api";
import Navbar from "../../components/Navbar";
import { Spinner, StatCard } from "../../components/common";
import { Download, Users, Briefcase, FileText, Trophy } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#6366f1"];

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminAPI.analytics()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="flex justify-center py-20"><Spinner /></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-red-500 font-medium text-lg mb-2">Failed to load analytics</p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
      </div>
    </div>
  );

  const overview = data?.overview || {};
  const funnel = data?.funnel || {};

  const funnelData = [
    { name: "Applied",      value: funnel.applied      || 0, fill: "#3b82f6" },
    { name: "Under Review", value: funnel.under_review  || 0, fill: "#6366f1" },
    { name: "Shortlisted",  value: funnel.shortlisted   || 0, fill: "#8b5cf6" },
    { name: "Interviewed",  value: funnel.interviewed   || 0, fill: "#f59e0b" },
    { name: "Offered",      value: funnel.offered       || 0, fill: "#10b981" },
    { name: "Rejected",     value: funnel.rejected      || 0, fill: "#ef4444" },
  ];

  const branchData = (data?.branchStats || []).map((b) => ({
    branch: b._id || "N/A",
    placed: b.placed || 0,
  }));

  const companyData = (data?.offersByCompany || []).slice(0, 6).map((c) => ({
    name: (c._id || "Unknown").slice(0, 14),
    offers: c.offers || 0,
  }));

  const totalApps = overview.totalApplications || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Placement Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">Real-time overview of campus placement activity</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.open("/api/admin/export/applications.csv","_blank")}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Download size={14} /> Applications CSV
            </button>
            <button
              onClick={() => window.open("/api/admin/export/activity-logs.csv","_blank")}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Download size={14} /> Audit Logs CSV
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Students" value={overview.totalStudents || 0} icon={<Users size={20}/>} color="blue"/>
          <StatCard title="Companies" value={overview.totalCompanies || 0} icon={<Briefcase size={20}/>} color="purple"/>
          <StatCard title="Active Jobs" value={overview.totalJobs || 0} icon={<FileText size={20}/>} color="orange"/>
          <StatCard title="Total Offers" value={funnel.offered || 0} icon={<Trophy size={20}/>} color="green"/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Funnel */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Application Funnel</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                <XAxis type="number" tick={{fontSize:12}} allowDecimals={false}/>
                <YAxis type="category" dataKey="name" tick={{fontSize:12}} width={95}/>
                <Tooltip/>
                <Bar dataKey="value" radius={[0,4,4,0]}>
                  {funnelData.map((e,i) => <Cell key={i} fill={e.fill}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Offers by company */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Offers by Company</h2>
            {companyData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                No offers recorded yet. Offers appear when application status is set to "Offered".
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={companyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="name" tick={{fontSize:11}}/>
                  <YAxis allowDecimals={false} tick={{fontSize:12}}/>
                  <Tooltip/>
                  <Bar dataKey="offers" fill="#3b82f6" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Branch pie */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Branch-wise Placements</h2>
            {branchData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                No placements yet. Branch data appears when offers are made.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={branchData} dataKey="placed" nameKey="branch"
                    cx="50%" cy="50%" outerRadius={90}
                    label={({branch,placed}) => `${branch}: ${placed}`}>
                    {branchData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip/>
                  <Legend/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status table */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Application Status Summary</h2>
            <div className="space-y-3">
              {funnelData.map((item) => (
                <div key={item.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor:item.fill}}/>
                      <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">
                      {item.value}
                      {totalApps > 0 && (
                        <span className="text-gray-400 font-normal ml-1">
                          ({Math.round((item.value/totalApps)*100)}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{
                      width:`${totalApps>0?(item.value/totalApps)*100:0}%`,
                      backgroundColor:item.fill
                    }}/>
                  </div>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between text-sm font-semibold text-gray-800">
                <span>Total Applications</span>
                <span>{totalApps}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
