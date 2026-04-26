import { useEffect, useState } from "react";
import { adminAPI } from "../../api";
import Navbar from "../../components/Navbar";
import { Spinner, EmptyState } from "../../components/common";
import toast from "react-hot-toast";
import { Search } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState(null);

  const fetchUsers = () => {
    setLoading(true);
    adminAPI.users({ role: roleFilter })
      .then((res) => setUsers(res.data.users || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  const handleToggle = async (id) => {
    setToggling(id);
    try {
      const res = await adminAPI.toggleUser(id);
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isActive: res.data.isActive } : u));
      toast.success(res.data.message);
    } catch { toast.error("Action failed."); }
    finally { setToggling(null); }
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">User Management</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
              placeholder="Search by name or email..."
            />
          </div>
          <div className="flex gap-2">
            {["", "student", "company", "admin"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  roleFilter === r
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800/50"
                }`}
              >
                {r === "" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="👥" title="No users found" description="Try adjusting your filters." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/50">
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Name</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Email</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Role</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Details</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Joined</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u._id} className={`border-b border-gray-50 hover:bg-gray-50 ${!u.isActive ? "opacity-50" : ""}`}>
                    <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{u.name}</td>
                    <td className="py-3 px-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className={`badge ${
                        u.role === "admin" ? "bg-purple-100 text-purple-700" :
                        u.role === "company" ? "bg-blue-100 text-blue-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500 text-xs">
                      {u.role === "student" ? `${u.branch || "—"} • CGPA ${u.cgpa || "—"}` : u.companyName || "—"}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`badge ${
                        !u.isApproved ? "bg-yellow-100 text-yellow-700" :
                        u.isActive ? "bg-green-100 text-green-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {!u.isApproved ? "Pending" : u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-3">
                      {u.role !== "admin" && (
                        <button
                          onClick={() => handleToggle(u._id)}
                          disabled={toggling === u._id}
                          className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                            u.isActive
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-green-50 text-green-600 hover:bg-green-100"
                          }`}
                        >
                          {toggling === u._id ? "..." : u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-3 px-3">Showing {filtered.length} users</p>
          </div>
        )}
      </div>
    </div>
  );
}
