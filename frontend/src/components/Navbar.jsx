import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useTheme } from "../context/ThemeContext";
import { Bell, LogOut, User, Menu, X, Zap, Sun, Moon } from "lucide-react";

const navLinks = {
  student: [
    { to: "/student/dashboard",    label: "Dashboard" },
    { to: "/student/jobs",         label: "Jobs" },
    { to: "/student/calendar",     label: "Calendar" },
    { to: "/student/saved",        label: "Saved" },
    { to: "/student/applications", label: "My Applications" },
    { to: "/student/profile",      label: "Profile" },
  ],
  company: [
    { to: "/company/dashboard", label: "Dashboard" },
    { to: "/company/post-job",  label: "Post Job" },
    { to: "/company/interviews", label: "Interviews" },
  ],
  admin: [
    { to: "/admin/dashboard",  label: "Dashboard" },
    { to: "/admin/approvals",  label: "Approvals" },
    { to: "/admin/analytics",  label: "Analytics" },
    { to: "/admin/users",      label: "Users" },
  ],
};

const roleBadgeStyle = {
  admin:   "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  company: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  student: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };
  const links = navLinks[user?.role] || [];

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/60 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ──────────────────────────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-primary-700 transition-colors">
              <Zap size={16} className="text-white fill-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white hidden sm:block tracking-tight">
              Place<span className="text-primary-600">IT</span>
            </span>
          </Link>

          {/* ── Desktop Nav ────────────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300
                           hover:text-primary-600 dark:hover:text-primary-400
                           hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* ── Right Side ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1.5">

            {/* Role badge */}
            <span className={`hidden sm:inline badge text-xs font-medium ${roleBadgeStyle[user?.role] || ""}`}>
              {user?.role}
            </span>

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400
                         hover:text-gray-800 dark:hover:text-gray-100
                         hover:bg-gray-100 dark:hover:bg-gray-700/60
                         transition-colors"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); markAllRead(); }}
                className="relative p-2 text-gray-500 dark:text-gray-400
                           hover:text-gray-700 dark:hover:text-gray-200
                           hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-lg transition-colors"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800
                                rounded-xl shadow-lg border border-gray-200 dark:border-gray-700
                                z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-100 dark:border-gray-700
                                  font-medium text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <Bell size={14} /> Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                      No notifications yet
                    </p>
                  ) : (
                    notifications.slice(0, 15).map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 border-b border-gray-50 dark:border-gray-700/50 text-sm
                          ${!n.read ? "bg-primary-50 dark:bg-primary-900/20" : "dark:bg-gray-800"}`}
                      >
                        <p className="text-gray-800 dark:text-gray-200">{n.message}</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                          {new Date(n.id).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* User + Logout */}
            <div className="flex items-center gap-1">
              <div className="hidden sm:flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                <User size={14} />
                <span className="font-medium truncate max-w-24">{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 dark:text-gray-400
                           hover:text-red-600 dark:hover:text-red-400
                           hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>

            {/* Mobile toggle */}
            <button
              className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-2 border-t border-gray-100 dark:border-gray-700">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300
                           hover:text-primary-600 dark:hover:text-primary-400
                           hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
