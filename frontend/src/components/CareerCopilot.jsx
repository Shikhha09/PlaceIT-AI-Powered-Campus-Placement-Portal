import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, Plus, RotateCcw, AlertCircle } from "lucide-react";
import { aiAPI, jobsAPI } from "../api";
import SafeMarkdown from "./SafeMarkdown";

// AI Career Copilot - conversational assistant.
//  * Free-text chat with follow-up memory (the transcript lives in React state; the last
//    few messages are sent with each request - the server never trusts them as instructions).
//  * The original one-click features (study plans, interview questions, resume skill
//    extraction) are kept as quick actions and their results appear inside the chat.
//  * Everything the model writes is rendered through SafeMarkdown (no HTML, no live links/images).
// Props: jobId (optional, from the Skill Gap page), jobTitle, variant: "embedded" | "page".

const MAX_LEN = 2000;
const HISTORY_SENT = 10;

const CONTEXT_LABELS = {
  profile: "your profile",
  resume: "your resume text",
  job: "the selected job",
  "skill-gap": "skill match",
  eligibility: "eligibility rules",
  applications: "your applications",
  "open-jobs": "open jobs",
};

// ── turn structured results from the existing generators into readable Markdown ──
const formatPlan = (plan) =>
  [
    plan.summary,
    ...plan.days.map((d) => `### Day ${d.day}: ${d.focus}\n${d.tasks.map((t) => `- ${t}`).join("\n")}`),
  ].join("\n\n");

const formatQuestions = (qs) =>
  qs.map((q, i) => `${i + 1}. **${q.question}** (${q.topic}) — _Hint:_ ${q.hint}`).join("\n\n");

const formatSkills = (suggestions) =>
  suggestions.length
    ? "Here are the skills I could confirm from your resume text (nothing is saved yet):\n\n" +
      suggestions.map((s) => `- **${s.name}**${s.alreadyInProfile ? " (already on your profile)" : ""}: “${s.evidence}”`).join("\n") +
      "\n\nTo add them, open your **Profile** page and use *Suggest skills*."
    : "I couldn't confirm any skills from your resume text. Make sure you've uploaded a text-based PDF on your Profile page.";

const friendlyError = (err) => {
  if (err.code === "ECONNABORTED") return "The AI took too long to answer. Please try again.";
  if (!err.response) return "Couldn't reach the server. Check your connection and try again.";
  return err.response.data?.error || "Something went wrong. Please try again.";
};

const timeLabel = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function CareerCopilot({ jobId = null, jobTitle = "", variant = "embedded" }) {
  const isPage = variant === "page";
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(jobId || "");
  const [jobs, setJobs] = useState([]);
  const [personalized, setPersonalized] = useState(Boolean(jobId));

  const messagesRef = useRef([]); // always-current copy, avoids stale state in async handlers
  const inFlight = useRef(false); // blocks duplicate submissions
  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const idRef = useRef(0);
  const nextId = () => ++idRef.current;

  const commit = (updater) => {
    const next = updater(messagesRef.current);
    messagesRef.current = next;
    setMessages(next);
  };

  useEffect(() => { setSelectedJob(jobId || ""); setPersonalized(Boolean(jobId)); }, [jobId]);

  useEffect(() => {
    if (!isPage) return;
    jobsAPI.getAll({ limit: 50 }).then((res) => setJobs(res.data.jobs || [])).catch(() => {});
  }, [isPage]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // keep the newest message in view (scroll only the chat box, not the whole page)
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  // auto-grow the textarea up to ~6 lines
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [input]);

  const buildHistory = (list) =>
    list.filter((m) => !m.error).slice(-HISTORY_SENT).map((m) => ({ role: m.role, content: m.content.slice(0, 2500) }));

  // ── free-text message ──────────────────────────────────────────────────────
  const send = async (raw, retry = false) => {
    const text = String(raw).trim();
    if (!text || text.length > MAX_LEN || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);

    let history;
    if (retry) {
      commit((list) => list.filter((m) => !m.error)); // drop the error bubble, keep the user's message
      history = buildHistory(messagesRef.current.slice(0, -1));
    } else {
      history = buildHistory(messagesRef.current);
      commit((list) => [...list, { id: nextId(), role: "user", content: text, ts: Date.now() }]);
      setInput("");
    }

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await aiAPI.chat(
        {
          message: text,
          conversationHistory: history,
          jobId: selectedJob || null,
          contextMode: personalized ? "personalized" : "general",
        },
        controller.signal
      );
      commit((list) => [...list, {
        id: nextId(), role: "assistant", content: res.data.reply,
        ts: Date.parse(res.data.timestamp) || Date.now(), contextUsed: res.data.contextUsed || [],
      }]);
    } catch (err) {
      if (controller.signal.aborted) return;
      commit((list) => [...list, { id: nextId(), role: "assistant", error: true, content: friendlyError(err), retryText: text, ts: Date.now() }]);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  // ── existing one-click features, shown inside the conversation ─────────────
  const runAction = async (kind) => {
    if (inFlight.current || (kind !== "skills" && !selectedJob)) return;
    inFlight.current = true;
    setLoading(true);
    const label = {
      plan7: "Create a 7-day study plan for this job.",
      plan14: "Create a 14-day study plan for this job.",
      questions: "Generate interview questions for this job.",
      skills: "Suggest skills from my resume.",
    }[kind];
    commit((list) => [...list, { id: nextId(), role: "user", content: label, ts: Date.now() }]);
    try {
      let content, used;
      if (kind === "plan7" || kind === "plan14") {
        const res = await aiAPI.studyPlan(selectedJob, kind === "plan14" ? 14 : 7);
        content = formatPlan(res.data.plan); used = ["job", "skill-gap"];
      } else if (kind === "questions") {
        const res = await aiAPI.interviewQuestions(selectedJob, 5);
        content = formatQuestions(res.data.questions); used = ["job", "skill-gap"];
      } else {
        const res = await aiAPI.suggestSkills();
        content = formatSkills(res.data.suggestions); used = ["resume"];
      }
      commit((list) => [...list, { id: nextId(), role: "assistant", content, ts: Date.now(), contextUsed: used }]);
    } catch (err) {
      commit((list) => [...list, { id: nextId(), role: "assistant", error: true, content: friendlyError(err), ts: Date.now() }]);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const newChat = () => {
    abortRef.current?.abort();
    inFlight.current = false;
    setLoading(false);
    commit(() => []);
    setInput("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  const hasJob = Boolean(selectedJob);
  const jobWord = hasJob ? "this job" : "a job I'm interested in";
  const suggestions = [
    { title: "Help me prepare for my next interview.", text: "Help me prepare for my next interview." },
    { title: "Explain my job skill gaps.", text: hasJob ? "Which skills am I missing for this job?" : "Which skills am I missing for a job? I haven't picked one yet." },
    { title: "Create a personalized 7-day study plan.", text: hasJob ? "Create a 7-day study plan for this job based on my skills." : "Create a 7-day study plan based on my skills." },
    { title: "Generate technical interview questions.", text: hasJob ? "Generate technical interview questions for this role." : "Generate technical interview questions for a software developer role." },
    { title: "Help me improve my resume.", text: "Help me improve my resume." },
    { title: "Explain a technical concept.", fill: "Explain the concept of " },
  ];

  const quick = [
    { id: "plan7", label: "7-day study plan", needsJob: true },
    { id: "plan14", label: "14-day study plan", needsJob: true },
    { id: "questions", label: "Interview questions", needsJob: true },
    { id: "skills", label: "Skills from my resume", needsJob: false },
  ];

  return (
    <div className={`card ${isPage ? "" : "mb-6"} flex flex-col p-0 overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">PlaceIT AI Career Copilot</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Your personal placement and career assistant</p>
          </div>
        </div>
        <button onClick={newChat} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0" title="Start a new conversation">
          <Plus size={14} /> New chat
        </button>
      </div>

      {/* Context controls */}
      <div className="px-4 sm:px-5 py-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
        {isPage ? (
          <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300 min-w-0">
            <span className="shrink-0">Job:</span>
            <select
              value={selectedJob}
              onChange={(e) => { setSelectedJob(e.target.value); setPersonalized(Boolean(e.target.value)); }}
              className="input py-1 text-xs max-w-[14rem] sm:max-w-xs"
              aria-label="Select a job for job-specific help"
            >
              <option value="">No specific job</option>
              {jobs.map((j) => (
                <option key={j._id} value={j._id}>{j.title}{j.company?.companyName ? ` — ${j.company.companyName}` : ""}</option>
              ))}
            </select>
          </label>
        ) : (
          jobTitle && <span className="text-gray-600 dark:text-gray-300">Job: <strong>{jobTitle}</strong></span>
        )}
        <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={personalized} onChange={(e) => setPersonalized(e.target.checked)} />
          Personalized answers (use my profile{hasJob ? " and this job" : ""})
        </label>
      </div>

      {/* Quick actions (the original one-click features) */}
      <div className="px-4 sm:px-5 py-2 flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800">
        {quick.map((a) => (
          <button
            key={a.id}
            onClick={() => runAction(a.id)}
            disabled={loading || (a.needsJob && !hasJob)}
            title={a.needsJob && !hasJob ? "Select a job first" : undefined}
            className="text-xs px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        aria-live="polite"
        className={`overflow-y-auto px-4 sm:px-5 py-4 space-y-4 ${isPage ? "h-[calc(100vh-24rem)] min-h-[20rem]" : "h-[28rem]"}`}
      >
        {messages.length === 0 && (
          <div className="py-2">
            <p className="font-semibold text-gray-900 dark:text-gray-100">Hi! I'm your PlaceIT Career Copilot.</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              I can help you with technical questions, placement preparation, resume improvement, interview practice and personalized career guidance.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 mb-4">What would you like to learn today?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.title}
                  disabled={loading}
                  onClick={() => (s.fill ? (setInput(s.fill), textareaRef.current?.focus()) : send(s.text))}
                  className="text-left text-sm p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 disabled:opacity-60"
                >
                  {s.title}
                </button>
              ))}
            </div>
            {isPage && !hasJob && (
              <p className="text-xs text-gray-400 mt-3">Tip: pick a job above to get answers about that specific role.</p>
            )}
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%]">
                <div className="bg-primary-600 text-white rounded-2xl rounded-br-sm px-4 py-2 text-sm whitespace-pre-wrap break-words">{m.content}</div>
                <p className="text-[10px] text-gray-400 text-right mt-1">{timeLabel(m.ts)}</p>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[92%] sm:max-w-[85%] min-w-0">
                {m.error ? (
                  <div className="rounded-2xl rounded-bl-sm px-4 py-2 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-red-700 dark:text-red-300 flex items-start gap-2" role="alert">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p>{m.content}</p>
                      {m.retryText && (
                        <button onClick={() => send(m.retryText, true)} disabled={loading} className="mt-1 inline-flex items-center gap-1 text-xs font-medium underline disabled:opacity-60">
                          <RotateCcw size={12} /> Retry
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl rounded-bl-sm px-4 py-3 text-sm bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 break-words">
                    <SafeMarkdown>{m.content}</SafeMarkdown>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-1">
                  {timeLabel(m.ts)}
                  {m.contextUsed?.length > 0 && <> · Based on {m.contextUsed.map((c) => CONTEXT_LABELS[c] || c).join(", ")}</>}
                </p>
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="flex justify-start" role="status">
            <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-gray-100 dark:bg-gray-800 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_LEN))}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask anything — a concept, your skill gaps, interview prep…"
            aria-label="Message the AI Career Copilot"
            className="input flex-1 resize-none text-sm"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="btn-primary h-10 w-10 p-0 flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <div className="flex justify-between mt-1.5 text-[11px] text-gray-400">
          <span>Enter to send · Shift+Enter for a new line</span>
          {input.length > 1700 && <span>{input.length}/{MAX_LEN}</span>}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          AI-generated and can be wrong. Not a hiring decision. Eligibility and skill match come from PlaceIT's rules.
        </p>
      </div>
    </div>
  );
}
