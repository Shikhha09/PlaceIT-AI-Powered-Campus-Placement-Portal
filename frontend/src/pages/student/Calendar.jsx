import { useEffect, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { jobsAPI, applicationsAPI } from "../../api";
import Navbar from "../../components/Navbar";
import { Spinner } from "../../components/common";
import { Link } from "react-router-dom";
import { X, Briefcase, MapPin, Calendar as CalIcon, IndianRupee } from "lucide-react";

// Setup date-fns localizer
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// Color by job type
const typeColor = {
  "full-time":  { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  "internship": { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  "contract":   { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
};

export default function PlacementCalendar() {
  const [events, setEvents]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [applying, setApplying]     = useState(false);
  const [view, setView]             = useState("month");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [jobRes, appRes] = await Promise.all([
          jobsAPI.getAll({ limit: 100 }),
          applicationsAPI.getMine(),
        ]);

        const jobs = jobRes.data.jobs || [];
        const myApps = appRes.data.applications || [];
        setAppliedIds(new Set(myApps.map((a) => a.job?._id || a.job)));

        // Convert each job to a calendar event
        const calEvents = jobs.map((job) => ({
          id: job._id,
          title: `${job.title} — ${job.company?.companyName || ""}`,
          start: new Date(job.createdAt),   // drive opens
          end: new Date(job.deadline),       // application deadline
          resource: job,
          allDay: true,
        }));

        setEvents(calEvents);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleApply = async (jobId) => {
    setApplying(true);
    try {
      await applicationsAPI.apply({ jobId });
      setAppliedIds((prev) => new Set([...prev, jobId]));
      setSelected((prev) => ({ ...prev, applied: true }));
      const { default: toast } = await import("react-hot-toast");
      toast.success("Application submitted!");
    } catch (err) {
      const { default: toast } = await import("react-hot-toast");
      toast.error(err.response?.data?.error || "Application failed.");
    } finally {
      setApplying(false);
    }
  };

  // Custom event styling
  const eventStyleGetter = (event) => {
    const job = event.resource;
    const colors = typeColor[job.jobType] || typeColor["full-time"];
    const isPast = new Date(job.deadline) < new Date();
    return {
      style: {
        backgroundColor: isPast ? "#f3f4f6" : colors.bg,
        color: isPast ? "#9ca3af" : colors.text,
        border: `1px solid ${isPast ? "#e5e7eb" : colors.border}`,
        borderRadius: "4px",
        fontSize: "11px",
        padding: "2px 4px",
      },
    };
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar /><div className="flex justify-center py-20"><Spinner /></div>
    </div>
  );

  const upcoming = events
    .filter((e) => new Date(e.end) >= new Date())
    .sort((a, b) => new Date(a.end) - new Date(b.end))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      {/* Custom calendar dark mode styles */}
      <style>{`
        .rbc-calendar { background: transparent; }
        .rbc-header { padding: 8px 4px; font-size: 13px; font-weight: 600; }
        .rbc-today { background-color: rgba(37,99,235,0.08) !important; }
        .rbc-off-range-bg { background-color: rgba(0,0,0,0.03); }
        .dark .rbc-calendar { color: #e5e7eb; }
        .dark .rbc-header { background: #1f2937; border-color: #374151; color: #d1d5db; }
        .dark .rbc-month-view,
        .dark .rbc-time-view,
        .dark .rbc-agenda-view { border-color: #374151; }
        .dark .rbc-day-bg { border-color: #374151; }
        .dark .rbc-off-range-bg { background-color: rgba(0,0,0,0.2); }
        .dark .rbc-today { background-color: rgba(37,99,235,0.15) !important; }
        .dark .rbc-toolbar button { color: #d1d5db; background: #1f2937; border-color: #374151; }
        .dark .rbc-toolbar button:hover { background: #374151; }
        .dark .rbc-toolbar button.rbc-active { background: #2563eb; color: white; border-color: #2563eb; }
        .dark .rbc-show-more { background: #1f2937; color: #60a5fa; }
        .dark .rbc-agenda-date-cell,
        .dark .rbc-agenda-time-cell { border-color: #374151; color: #d1d5db; background: #111827; }
        .dark .rbc-agenda-event-cell { border-color: #374151; background: #1f2937; }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Placement Calendar</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              All active drives — click any event for details
            </p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            {Object.entries(typeColor).map(([type, colors]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }} />
                <span className="text-gray-600 dark:text-gray-400 capitalize">{type}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300" />
              <span className="text-gray-600 dark:text-gray-400">Closed</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sidebar — Upcoming Deadlines */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wide">
              ⏰ Upcoming Deadlines
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming drives.</p>
            ) : (
              upcoming.map((ev) => {
                const job = ev.resource;
                const daysLeft = Math.ceil((new Date(job.deadline) - new Date()) / (1000*60*60*24));
                const isApplied = appliedIds.has(job._id);
                return (
                  <div key={ev.id}
                    onClick={() => setSelected(job)}
                    className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700/50 cursor-pointer hover:border-primary-300 dark:hover:border-primary-600 transition-colors">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{job.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{job.company?.companyName}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        daysLeft <= 3 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        daysLeft <= 7 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      }`}>
                        {daysLeft}d left
                      </span>
                      {isApplied && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">Applied ✓</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Calendar */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700/50 p-4 shadow-sm"
            style={{ height: 600 }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              views={["month", "week", "agenda"]}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={(event) => setSelected(event.resource)}
              popup
              style={{ height: "100%" }}
            />
          </div>
        </div>
      </div>

      {/* Job Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}>

            <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selected.title}</h2>
                <p className="text-primary-600 dark:text-primary-400 font-medium mt-0.5">
                  {selected.company?.companyName}
                </p>
              </div>
              <button onClick={() => setSelected(null)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Job details grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Briefcase size={14}/>, label: "Type", value: selected.jobType },
                  { icon: <IndianRupee size={14}/>, label: "CTC", value: selected.ctc },
                  { icon: <MapPin size={14}/>, label: "Location", value: selected.location },
                  { icon: <CalIcon size={14}/>, label: "Deadline", value: new Date(selected.deadline).toLocaleDateString("en-IN") },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 text-xs mb-1">
                      {item.icon} {item.label}
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm capitalize">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Eligibility */}
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Eligibility</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                    Min CGPA: {selected.minCGPA}
                  </span>
                  {(selected.allowedBranches || []).map((b) => (
                    <span key={b} className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Required Skills</p>
                <div className="flex flex-wrap gap-2">
                  {(selected.requiredSkills || []).map((s) => (
                    <span key={s} className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border border-primary-100 dark:border-primary-800/40 px-2 py-1 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                {selected.description}
              </p>
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 flex gap-3">
              {new Date(selected.deadline) < new Date() ? (
                <div className="flex-1 text-center py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg text-sm font-medium">
                  Applications Closed
                </div>
              ) : appliedIds.has(selected._id) ? (
                <div className="flex-1 text-center py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium border border-green-200 dark:border-green-800/40">
                  ✓ Applied
                </div>
              ) : (
                <button
                  onClick={() => handleApply(selected._id)}
                  disabled={applying}
                  className="flex-1 btn-primary py-2.5 text-sm"
                >
                  {applying ? "Applying..." : "Apply Now"}
                </button>
              )}
              <Link
                to="/student/jobs"
                onClick={() => setSelected(null)}
                className="btn-secondary text-sm px-4"
              >
                View All Jobs
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
