import api from "./axios";

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
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