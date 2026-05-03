import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import {
  Zap, Sun, Moon, ArrowRight, Brain, Bell, BarChart3,
  FileSearch, Users, Building2, ShieldCheck, ChevronRight,
  Star, CheckCircle, Upload, Search, Award
} from "lucide-react";

// ── Data ──────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: <Brain size={24} />,
    title: "AI Candidate Ranking",
    description:
      "TF-IDF cosine similarity + Gradient Boosting ML ranks 150+ resumes in under 10 seconds. What took recruiters 4 hours now takes one click.",
    color: "blue",
  },
  {
    icon: <Bell size={24} />,
    title: "Real-Time Notifications",
    description:
      "Socket.io WebSockets push live updates the moment status changes. Students know instantly — no more calling the TPO.",
    color: "purple",
  },
  {
    icon: <FileSearch size={24} />,
    title: "Skill Gap Analyzer",
    description:
      "Students see exactly which skills they're missing for any job before applying — with a match percentage and actionable guidance.",
    color: "green",
  },
  {
    icon: <BarChart3 size={24} />,
    title: "Admin Analytics",
    description:
      "Live placement funnel, branch-wise stats, offer rates, and CSV exports. TPOs get data-driven insights, not end-of-year guesswork.",
    color: "orange",
  },
  {
    icon: <Upload size={24} />,
    title: "Resume Parsing",
    description:
      "PDF and DOCX resumes are automatically parsed and converted to structured text that feeds directly into the AI scoring pipeline.",
    color: "pink",
  },
  {
    icon: <ShieldCheck size={24} />,
    title: "Role-Based Security",
    description:
      "JWT auth, bcrypt hashing, rate limiting, and NoSQL injection prevention. Three isolated roles — Student, Company, Admin.",
    color: "red",
  },
];

const roles = [
  {
    icon: <Users size={28} />,
    role: "Students",
    color: "green",
    points: [
      "Browse jobs filtered by your eligibility",
      "Get AI-powered job recommendations",
      "Check skill gap before applying",
      "Track application status live",
      "View upcoming interview schedule",
    ],
  },
  {
    icon: <Building2 size={28} />,
    role: "Companies",
    color: "blue",
    points: [
      "Post jobs with custom eligibility criteria",
      "Trigger AI shortlisting in one click",
      "See ranked candidates with score breakdown",
      "Schedule interviews directly",
      "Track entire hiring pipeline",
    ],
  },
  {
    icon: <ShieldCheck size={28} />,
    role: "Admin (TPO)",
    color: "purple",
    points: [
      "Approve student and company accounts",
      "Monitor live placement analytics",
      "Export reports as CSV",
      "Full activity audit trail",
      "Manage all users centrally",
    ],
  },
];

const stats = [
  { value: "10s", label: "AI shortlists 150+ resumes" },
  { value: "3", label: "Services in production" },
  { value: "90%", label: "Reduction in screening time" },
  { value: "87%", label: "ML model accuracy" },
];

const colorMap = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-900/20",   icon: "text-blue-600 dark:text-blue-400",   border: "border-blue-100 dark:border-blue-800/40" },
  purple: { bg: "bg-purple-50 dark:bg-purple-900/20", icon: "text-purple-600 dark:text-purple-400", border: "border-purple-100 dark:border-purple-800/40" },
  green:  { bg: "bg-green-50 dark:bg-green-900/20",  icon: "text-green-600 dark:text-green-400",  border: "border-green-100 dark:border-green-800/40" },
  orange: { bg: "bg-orange-50 dark:bg-orange-900/20", icon: "text-orange-600 dark:text-orange-400", border: "border-orange-100 dark:border-orange-800/40" },
  pink:   { bg: "bg-pink-50 dark:bg-pink-900/20",   icon: "text-pink-600 dark:text-pink-400",   border: "border-pink-100 dark:border-pink-800/40" },
  red:    { bg: "bg-red-50 dark:bg-red-900/20",     icon: "text-red-600 dark:text-red-400",     border: "border-red-100 dark:border-red-800/40" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Landing() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm">
              <Zap size={16} className="text-white fill-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">
              Place<span className="text-primary-600">IT</span>
            </span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
            <a href="#features" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">How It Works</a>
            <a href="#roles" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Roles</a>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/login" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              Sign In
            </Link>
            <Link to="/register"
              className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-blue-800 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 dark:bg-gray-800/60 text-white dark:text-gray-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-white/20 dark:border-gray-700">
            <Zap size={12} className="fill-yellow-300 text-yellow-300" />
            AI-Powered Campus Placement Portal
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            Campus Placement,{" "}
            <span className="text-blue-300">Reimagined</span>
            <br />with AI
          </h1>

          <p className="text-lg md:text-xl text-primary-100 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Replace Excel sheets and WhatsApp groups with a structured platform.
            AI ranks 150+ candidates in 10 seconds. Students, companies, and TPOs
            — all on one system.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-50 transition-colors shadow-lg">
              Start for Free <ArrowRight size={18} />
            </Link>
            <Link to="/login"
              className="inline-flex items-center justify-center gap-2 bg-white/10 dark:bg-gray-800/60 text-white border border-white/30 dark:border-gray-600 font-semibold px-8 py-3.5 rounded-xl hover:bg-white/20 dark:hover:bg-gray-700 transition-colors">
              View Demo
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl mx-auto">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-primary-200 dark:text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              How PlaceIT Works
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              The entire placement lifecycle — from registration to offer — in one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: <Users size={24} />, title: "Register & Get Approved", desc: "Students and companies register. Admin (TPO) verifies and approves accounts — ensuring only real users access the portal.", color: "blue" },
              { step: "02", icon: <Search size={24} />, title: "Post Jobs & Apply", desc: "Companies post jobs with eligibility criteria. Students browse personalized recommendations and apply with automatic CGPA + branch checks.", color: "purple" },
              { step: "03", icon: <Award size={24} />, title: "AI Shortlist & Hire", desc: "Company triggers AI shortlisting — candidates ranked by resume match + ML score. Interviews scheduled, offers made, everything tracked.", color: "green" },
            ].map((item) => (
              <div key={item.step} className="relative bg-white dark:bg-gray-800/60 rounded-2xl p-8 border border-gray-100 dark:border-gray-700/50 shadow-sm">
                <div className="absolute -top-4 left-8 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Step {item.step}
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 mt-2 ${colorMap[item.color].bg}`}>
                  <span className={colorMap[item.color].icon}>{item.icon}</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Built with production-grade tech. No shortcuts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title}
                className={`p-6 rounded-2xl border ${colorMap[f.color].border} ${colorMap[f.color].bg} hover:shadow-md transition-shadow`}>
                <div className={`w-11 h-11 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center mb-4 shadow-sm ${colorMap[f.color].icon}`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ──────────────────────────────────────────────────────────── */}
      <section id="roles" className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Built for Every Role
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Three tailored experiences. One unified platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((r) => (
              <div key={r.role}
                className="bg-white dark:bg-gray-800/60 rounded-2xl p-8 border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${colorMap[r.color].bg} ${colorMap[r.color].icon}`}>
                  {r.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{r.role}</h3>
                <ul className="space-y-3">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle size={15} className={`shrink-0 mt-0.5 ${colorMap[r.color].icon}`} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ─────────────────────────────────────────────────────── */}
      <section className="py-16 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-8">
            Built With
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {["React 18", "Node.js", "Express", "Python", "FastAPI", "MongoDB", "Socket.io", "scikit-learn", "Tailwind CSS", "Supabase", "Vercel", "Render"].map((tech) => (
              <span key={tech}
                className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-full border border-gray-200 dark:border-gray-700">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-blue-700 dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Zap size={32} className="text-white fill-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Placements?
          </h2>
          <p className="text-primary-200 dark:text-gray-400 mb-8 text-lg">
            Join PlaceIT and bring AI-powered placement to your campus.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-50 transition-colors shadow-lg">
              Get Started Free <ArrowRight size={18} />
            </Link>
            <Link to="/login"
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors">
              Sign In <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-950 dark:bg-black py-10 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
                <Zap size={14} className="text-white fill-white" />
              </div>
              <span className="font-bold text-white">
                Place<span className="text-primary-400">IT</span>
              </span>
            </div>
            <p className="text-gray-500 text-sm text-center">
              © 2025 PlaceIT · AI-Powered Campus Placement Portal · Built with React, Node.js & Python
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link to="/register" className="hover:text-white transition-colors">Register</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
