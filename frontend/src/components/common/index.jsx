// ── Status badge ──────────────────────────────────────────────────────────────
const statusColors = {
  applied:      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  under_review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  shortlisted:  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  interviewed:  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  offered:      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  rejected:     "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  scheduled:    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed:    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled:    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function StatusBadge({ status }) {
  return (
    <span className={`badge ${statusColors[status] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>
      {status?.replace("_", " ").toUpperCase()}
    </span>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────
export function ScoreBar({ score, label }) {
  const color =
    score >= 75 ? "bg-green-500" :
    score >= 50 ? "bg-yellow-500" :
    "bg-red-500";
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{label}</span>
          <span>{score?.toFixed(1)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = "md" }) {
  const sizes = { sm: "w-4 h-4", md: "w-8 h-8", lg: "w-12 h-12" };
  return (
    <div className={`${sizes[size]} border-4 border-primary-200 dark:border-primary-900 border-t-primary-600 rounded-full animate-spin`} />
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</h3>
      {description && <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({ title, value, icon, color = "blue", sub }) {
  const colors = {
    blue:   "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green:  "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    red:    "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
