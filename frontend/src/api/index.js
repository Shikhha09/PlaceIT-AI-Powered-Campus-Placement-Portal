import api from "./axios";

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  me: (token) => api.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } }),
  me: () => api.get("/auth/me"),
  pending: () => api.get("/auth/pending"),
  approve: (id, action) => api.patch(`/auth/approve/${id}`, { action }),
  updateProfile: (data) => api.patch("/auth/student-profile", data),
  uploadResume: (formData) =>
    api.patch("/auth/student-resume", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobsAPI = {
  getAll: (params) => api.get("/jobs", { params }),
  getOne: (id) => api.get(`/jobs/${id}`),
  getRecommended: () => api.get("/jobs/recommended"),
  getSkillGap: (id) => api.get(`/jobs/${id}/skill-gap`),
  getMyJobs: () => api.get("/jobs/company/mine"),
  create: (data) => api.post("/jobs", data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
};

// ── Applications ──────────────────────────────────────────────────────────────
export const applicationsAPI = {
  apply: (jobId, coverNote) => api.post("/applications", { jobId, coverNote }),
  getMine: () => api.get("/applications/mine"),
  getForJob: (jobId) => api.get(`/applications/job/${jobId}`),
  updateStatus: (id, status) => api.patch(`/applications/${id}/status`, { status }),
};

// ── Interviews ────────────────────────────────────────────────────────────────
export const interviewsAPI = {
  schedule: (data) => api.post("/interviews", data),
  getStudentInterviews: () => api.get("/interviews/student"),
  getCompanyInterviews: () => api.get("/interviews/company"),
  update: (id, data) => api.patch(`/interviews/${id}`, data),
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiAPI = {
  shortlist: (jobId) => api.post(`/ai/shortlist/${jobId}`),
  health: () => api.get("/ai/health"),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  analytics: () => api.get("/admin/analytics"),
  users: (params) => api.get("/admin/users", { params }),
  activityLogs: (params) => api.get("/admin/activity-logs", { params }),
  exportApplications: () => window.open("/api/admin/export/applications.csv", "_blank"),
  exportLogs: () => window.open("/api/admin/export/activity-logs.csv", "_blank"),
  toggleUser: (id) => api.patch(`/admin/users/${id}/toggle`),
};

// ── Bookmarks (localStorage-based — no backend needed) ────────────────────────
export const bookmarkAPI = {
  getAll: () => {
    try { return JSON.parse(localStorage.getItem("placeit_bookmarks") || "[]"); }
    catch { return []; }
  },
  add: (job) => {
    const bookmarks = bookmarkAPI.getAll();
    if (!bookmarks.find((b) => b._id === job._id)) {
      localStorage.setItem("placeit_bookmarks", JSON.stringify([...bookmarks, job]));
    }
  },
  remove: (jobId) => {
    const bookmarks = bookmarkAPI.getAll().filter((b) => b._id !== jobId);
    localStorage.setItem("placeit_bookmarks", JSON.stringify(bookmarks));
  },
  isBookmarked: (jobId) => bookmarkAPI.getAll().some((b) => b._id === jobId),
};
