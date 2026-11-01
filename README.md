# ⚡ PlaceIT — AI-Powered Campus Placement Portal

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-2563eb?style=for-the-badge&logo=vercel)](https://placeit-ai-powered-campus-placemen.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/Shikhha09/PlaceIT-AI-Powered-Campus-Placement-Portal)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> A full-stack distributed system that replaces manual campus placement processes with an AI-powered platform featuring ML candidate ranking, real-time notifications, placement calendar, and WhatsApp alerts.

---

## 📸 Screenshots

| Landing Page | Student Dashboard | AI Shortlisting |
|---|---|---|
| ![Landing](docs/landing.png) | ![Student](docs/student-dashboard.png) | ![AI](docs/ai-shortlist.png) |

| Admin Analytics | Placement Calendar | Company Dashboard |
|---|---|---|
| ![Analytics](docs/analytics.png) | ![Calendar](docs/calendar.png) | ![Company](docs/company-dashboard.png) |

> **Live Demo:** [placeit-ai-powered-campus-placemen.vercel.app](https://place-it-ai-powered-campus-placemen.vercel.app/)
> Use one-click demo buttons on the login page to explore all three roles instantly.

---

## 🎯 Problem It Solves

Most college placement cells still run on **Excel sheets, WhatsApp groups, and paper forms**. This causes:

- Students miss drives because of late informal notifications
- TPOs spend 3-4 hours manually screening 150+ resumes per drive
- No visibility into application status — students call the TPO individually
- No data on placement trends — reports compiled manually at year end
- Companies receive unsorted resume dumps with no ranking or filtering

**PlaceIT replaces this entire workflow** with a structured, AI-powered platform:

| Manual Process | PlaceIT |
|---|---|
| WhatsApp/notice board announcements | Real-time Socket.io + WhatsApp notifications |
| TPO screens resumes manually (3-4 hrs) | AI ranks 150+ candidates in 10 seconds |
| Students unaware of skill gaps | Skill Gap Analyzer shows exactly what's missing |
| Status via notice board or phone calls | Live dashboard + email + WhatsApp updates |
| Interview scheduling via email chains | Direct scheduling with auto-notification |
| End-of-year manual placement report | Live analytics dashboard with CSV export |
| No account verification | Email verification + admin approval flow |

---

## ✨ Features

### Student
- Role-based registration with **email verification** and admin approval flow
- Resume upload (PDF/DOCX) with automatic text extraction and parse validation warning
- Personalized job recommendations ranked by skill match percentage
- **Skill Gap Analyzer** — see exactly which skills are missing for any job before applying
- Apply to jobs with automatic CGPA and branch eligibility enforcement
- **Placement Drive Calendar** — monthly/weekly/agenda view of all active drives
- **Job Bookmarking** — save jobs to apply later, persisted in localStorage
- Real-time application status tracking with pipeline progress bar
- Live Socket.io notifications — no page refresh needed
- Interview schedule tracking with date, mode, and Google Meet links
- AI Score visible on each application with Skill Match, CGPA, ML Confidence breakdown
- WhatsApp notifications when application status changes

### Company
- Post jobs with required skills, minimum CGPA, allowed branches, and deadline
- View all applicants ranked by AI shortlisting scores
- **AI Shortlisting** — TF-IDF + Gradient Boosting ML ranks candidates in seconds
- Graceful fallback ranking (CGPA + skill overlap) when AI service is sleeping
- Update application status with automated email and WhatsApp notifications to students
- Schedule interviews directly — online/offline, with meet link or venue
- **Analytics Dashboard** — applicants per job bar chart, application status pie chart
- Pagination on applicants list — handles 200+ applicants without crashing
- Loading state on status updates — prevents double-submit

### Admin (TPO)
- Approve or reject student and company registrations
- Only email-verified accounts appear in the pending approvals list
- Live analytics dashboard — placement funnel, branch-wise stats, offers by company
- Export application data and audit logs as CSV with JWT authentication
- User management with search, role filter, activate/deactivate
- Full activity audit trail — every action logged with actor, timestamp, and metadata

### Security and Auth
- JWT authentication with configurable expiry
- bcryptjs password hashing (12 salt rounds)
- **Password reset flow** — time-limited email token (1 hour expiry)
- **Email verification** on registration before admin sees the account
- **Google OAuth login** — one-click Google sign-in via Passport.js
- Rate limiting on auth routes (disabled in development, strict in production)
- HTTP security headers via Helmet
- NoSQL injection prevention via mongo-sanitize
- Role-based access control on every protected backend route
- React Error Boundaries — no white screen crashes in production

### AI Service
- TF-IDF Cosine Similarity — resume text vs job description semantic matching (40% weight)
- Gradient Boosting Classifier — 87% accuracy placement prediction ML model (30% weight)
- CGPA normalized score (30% weight)
- Explainable scores — breakdown shows Skill Match %, CGPA Score, ML Confidence %
- Resume text extraction from PDF via pdfplumber and DOCX via python-docx
- Resume parse warning — alerts student if text extraction failed (scanned PDF)
- Fallback scorer — ranks by CGPA and skill overlap when AI service is unavailable

### Notifications
- Real-time Socket.io notifications with bell icon badge and toast popups
- Email notifications via Gmail SMTP — application received, status updated, interview scheduled, account approved
- WhatsApp notifications via Twilio — instant messages on status changes and interviews

---

## 🤖 AI Career Copilot (LLM features)

PlaceIT has two AI layers that are deliberately kept separate:

| Layer | What it does | Where |
|---|---|---|
| **Ranking (classic ML)** | TF-IDF + skill overlap + CGPA + a Gradient Boosting signal rank applicants for companies | `ai-service/scorer.py` |
| **Career Copilot (LLM)** | Helps *students* prepare: study plans, interview questions, skill suggestions from their resume | `ai-service/copilot.py`, `backend/routes/ai.js` |

**The LLM never decides eligibility, scores or rankings.** Matched/missing skills are computed
deterministically by the backend (`backend/utils/skills.js`) and handed to the model as facts.

### Features
- **Conversational chat** (full page at **AI Copilot** in the nav, and embedded on the Skill Gap page): type any question and ask follow-ups. General technical questions get general answers; placement questions use real PlaceIT data. Details below.
- **Study plan (7 or 14 days)** and **interview questions** on the Skill Gap page, built around the student's verified gaps for that job.
- **Suggest skills from my resume** on the Profile page. Each suggestion must quote a line from the resume; nothing is saved until the student adds it and clicks *Save Changes*.
- **Skill normalisation**: `ReactJS`, `React.js` and `react` now count as the same skill in skill-gap, fallback ranking and the ML scorer.

### Request flow
```
React ──JWT──▶ Express (auth, role check, zod validation, per-user rate limit,
                        deterministic skill gap) ──X-Internal-Key──▶ FastAPI
                                                     (prompt build, LLM call, schema validation,
                                                      grounding checks, link stripping)
```
The browser never talks to the LLM or to FastAPI, and no provider key exists in frontend code.

### AI chat: how it works
- **Endpoint:** `POST /api/ai/copilot/chat` (students only, JWT required, same per-user rate limits as the other Copilot calls).
  ```jsonc
  // request
  { "message": "Explain it using my PlaceIT project",           // 1-2000 chars
    "conversationHistory": [{ "role": "user"|"assistant", "content": "..." }],   // max 40 accepted, last 10 used
    "jobId": "<optional job id>",
    "contextMode": "general" | "personalized" }
  // response
  { "success": true, "reply": "...markdown...", "conversationId": null,
    "timestamp": "ISO date", "contextUsed": ["profile", "job", "skill-gap"] }
  ```
  Unknown fields (for example `studentId`) are rejected with 400. Errors are `{ "error": "..." }` with friendly text only.
- **Memory:** the browser keeps the transcript in React state and sends the most recent messages with every request. Nothing is stored on the server yet, so conversations are isolated per browser session; `conversationId` is reserved for MongoDB persistence later. The history is treated as **untrusted** (a user can edit it): it is size-capped, only `user`/`assistant` roles are accepted, and the model receives it as a quoted transcript, never as instructions.
- **Personal data is fetched only when relevant.** `backend/services/chatContextService.js` decides from the message (or from the *Personalized answers* switch) which blocks to load: profile, selected job, skill match, eligibility, the student's own applications, open jobs, or a masked resume excerpt. A question like "What is RAG?" touches the database zero times. Every query is scoped to the JWT user, selects a fixed whitelist of fields (never email, phone, password or tokens), and the model cannot query anything itself.
- **Eligibility and skill match come from PlaceIT rules** (`utils/eligibility.js`, `utils/skills.js`) and are given to the model as facts. If data isn't provided (an application status, a deadline), the system prompt tells the model to say it doesn't have it.
- **Existing features stay:** the 7/14-day plan, interview-question and resume-skill buttons are quick actions above the chat, and their results appear as messages. A typed request such as "make a 7-day plan for this job" is answered by the chat model using the same verified skill-gap facts.
- **Safe rendering:** replies are rendered with `react-markdown` + `remark-gfm`: raw HTML is skipped, links are inert text, images are never loaded.
- **Frontend tests:** `cd frontend && npm test` (Vitest + Testing Library).

### Safety design
- **Identity from the JWT only.** Bodies containing `studentId` or any unknown field are rejected (400).
- **Prompt injection**: resume/job/user text is cleaned (invisible characters, fake closing tags), length-capped, fenced in tags and declared untrusted in the system prompt. Output is validated against a Pydantic schema, extracted skills must be quoted from the resume, links are stripped from model output, and suspicious inputs are flagged in the activity log.
- **Service-to-service auth**: FastAPI requires `X-Internal-Key`; in production it refuses to start serving without one.
- **SSRF guard**: `/parse-resume` only downloads from allow-listed storage hosts (Cloudinary, `*.supabase.co`), never follows redirects and caps file size.
- **Authenticated sockets**: Socket.io now verifies the JWT; clients can no longer join another user's notification room.
- **Cost & abuse controls**: per-student limits (`COPILOT_RATE_PER_MIN`, `COPILOT_DAILY_CAP`), request size limits, provider timeout, graceful "AI unavailable" message.
- **Privacy**: logs hold task, latency, token counts and flags only, never resumes, prompts or answers.

### Setup
1. `cp backend/.env.example backend/.env` and `cp ai-service/.env.example ai-service/.env`
2. Create a Gemini API key in Google AI Studio and set `LLM_API_KEY` in `ai-service/.env`.
3. Set the **same** random `AI_SERVICE_API_KEY` in both `.env` files.
4. Run the AI service and backend as usual. Without `LLM_API_KEY` the Copilot buttons show a friendly "unavailable" message and everything else keeps working.

### Tests and evaluation
```bash
cd ai-service && pip install -r requirements-dev.txt && pytest -q     # fake LLM, no key needed
cd backend && npm test                                               # Copilot route tests need no database
cd ai-service && LLM_API_KEY=... python eval/run_eval.py             # real LLM: precision/recall vs keyword baseline, latency, tokens
```
Add ~25 real, anonymised resumes to `ai-service/eval/cases.json` before quoting any number from the eval.

### Known limitations
- The Gradient Boosting model in `ai-service/model/train.py` is trained on **synthetic** data whose labels come from a formula, so its accuracy figure measures how well it reproduces that formula, not real placement outcomes. Treat it as a demo signal until trained on real historical data.
- Only Gemini is implemented (the provider is one small class in `ai-service/llm.py`).
- Chat history is not persisted (browser memory only) and replies are not streamed, so answers appear all at once after a few seconds.
- Chat decides which PlaceIT data to load with keyword rules, not model-driven tool calling, so an unusual phrasing may not trigger a lookup (the model then says it lacks the data). The *Personalized answers* switch forces profile/job context.
- RAG over a placement knowledge base is planned, not built: the assistant's general-knowledge answers come from the model itself.
- Free-tier Gemini quotas are small; each chat message is one model call.

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + Vite | UI framework with fast HMR |
| Tailwind CSS v3 | Utility-first styling with full dark mode |
| React Router v6 | Client-side routing with protected routes |
| Socket.io Client | Real-time notifications |
| Recharts | Analytics charts — Bar, Pie, Funnel |
| react-big-calendar | Placement drive calendar |
| React Hook Form + Zod | Form handling with schema validation |
| Axios | HTTP client with JWT interceptor |
| date-fns | Date formatting for calendar |
| Lucide React | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| Node.js 20 + Express 5 | REST API server |
| MongoDB + Mongoose | Database with schema validation |
| JWT + bcryptjs | Authentication and password hashing |
| Passport + passport-google-oauth20 | Google OAuth login |
| Socket.io | WebSocket server for real-time events |
| Multer | File upload middleware |
| Supabase Storage | Cloud file storage for resumes |
| Nodemailer | Transactional email via Gmail SMTP |
| Twilio | WhatsApp notifications |
| Helmet + mongo-sanitize | Security headers and NoSQL injection prevention |
| express-rate-limit | Brute force protection |
| Jest + Supertest | Integration testing (30+ tests) |

### AI Service
| Technology | Purpose |
|---|---|
| Python 3.11 + FastAPI | Async API for ML inference |
| scikit-learn | Gradient Boosting Classifier |
| TF-IDF Vectorizer | Resume-to-job description similarity |
| pdfplumber | PDF text extraction |
| python-docx | DOCX text extraction |
| joblib | ML model serialization |

### Infrastructure
| Technology | Purpose |
|---|---|
| MongoDB Atlas | Cloud database |
| Supabase Storage | Resume file storage with public CDN |
| Vercel | Frontend deployment with auto-deploy |
| Render | Backend and AI service deployment |
| Docker + Docker Compose | Multi-service containerization |
| GitHub Actions | CI/CD pipeline with automated tests |

---

## 🏗️ Architecture

```
Browser (React + Vite)
        |
        | HTTP/REST + WebSocket
        |
Express Backend API (Node.js) ──── MongoDB Atlas
        |                     ──── Supabase Storage
        | HTTP                ──── Gmail SMTP
        |                     ──── Twilio WhatsApp
Python AI Service (FastAPI)
        |
        ML Model (scikit-learn)
        Resume Parser (pdfplumber)
```

The three services are fully independent. Frontend talks only to Express. Express calls the AI service internally when shortlisting is triggered. Each service can be deployed and scaled independently.

---

## ⚙️ Setup and Installation

### Prerequisites

- Node.js 20 or higher
- Python 3.11
- MongoDB local or Atlas account
- Git

### Step 1 — Clone the repository

```bash
git clone https://github.com/Shikhha09/PlaceIT-AI-Powered-Campus-Placement-Portal.git
cd PlaceIT-AI-Powered-Campus-Placement-Portal
```

### Step 2 — Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env with your values — see Environment Variables section below
npm install
npm run seed
npm run dev
```

Backend runs at `http://localhost:5000`
Health check: `http://localhost:5000/api/health`

### Step 3 — Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### Step 4 — AI service setup

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
python model/train.py         # Train ML model once — takes ~30 seconds
uvicorn main:app --reload --port 8000
```

AI service runs at `http://localhost:8000`
Health check: `http://localhost:8000/health`

### Or run everything with Docker

```bash
docker-compose up --build
```

---

## 🔑 Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB Atlas
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/campus_placement

# JWT
JWT_SECRET=generate_with_node_crypto_randomBytes_64_hex
JWT_EXPIRE=7d

# Supabase Storage (resume uploads)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_BUCKET=resumes

# Gmail SMTP (email notifications)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your@gmail.com
MAIL_PASS=your_16_char_app_password
MAIL_FROM=your@gmail.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
SERVER_URL=http://localhost:5000

# Twilio WhatsApp (optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# AI Service URL
AI_SERVICE_URL=http://localhost:8000

# Frontend URL for CORS
CLIENT_URL=http://localhost:5173
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🎭 Demo Accounts

After running `npm run seed` in the backend folder:

| Role | Email | Password |
|---|---|---|
| Admin (TPO) | admin@campus.local | Password@123 |
| Company | hr@technova.com | Password@123 |
| Company | recruit@infosys.com | Password@123 |
| Student | aarav@student.edu | Password@123 |
| Student | priya@student.edu | Password@123 |
| Student | rohan@student.edu | Password@123 |

The login page also has one-click demo buttons for each role — no typing required.

---

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register               Register student or company
POST   /api/auth/login                  Login and receive JWT
GET    /api/auth/me                     Get current user profile
GET    /api/auth/pending                Pending approvals (admin only)
PATCH  /api/auth/approve/:id            Approve or reject user (admin only)
PATCH  /api/auth/student-profile        Update student profile
PATCH  /api/auth/student-resume         Upload resume file (multipart/form-data)
POST   /api/auth/forgot-password        Send password reset email
POST   /api/auth/reset-password/:token  Reset password with token
GET    /api/auth/verify-email/:token    Verify email address
GET    /api/auth/google                 Google OAuth redirect
GET    /api/auth/google/callback        Google OAuth callback
```

### Jobs
```
GET    /api/jobs                        List jobs with eligibility filter and pagination
POST   /api/jobs                        Post new job (company only)
PUT    /api/jobs/:id                    Update job (company only)
DELETE /api/jobs/:id                    Delete job (company or admin)
GET    /api/jobs/recommended            AI-ranked recommendations for student
GET    /api/jobs/:id/skill-gap          Skill gap analysis for student
GET    /api/jobs/company/mine           Jobs posted by the current company
```

### Applications
```
POST   /api/applications                Apply to a job (student only)
GET    /api/applications/mine           Student's own applications
GET    /api/applications/job/:jobId     All applicants for a job (company)
PATCH  /api/applications/:id/status     Update status — triggers email + WhatsApp
```

### AI Service
```
POST   /api/ai/shortlist/:jobId         Rank all candidates with ML (fallback if down)
GET    /api/ai/health                   AI service health check
POST   /api/ai/copilot/study-plan       Student: LLM study plan for a job {jobId, days: 7|14, focus?}
POST   /api/ai/copilot/interview-questions  Student: LLM interview questions {jobId, count: 3-8}
POST   /api/ai/copilot/extract-skills   Student: suggest skills from own resume (does not save)
POST   /api/ai/copilot/chat             Student: free-text conversation {message, conversationHistory, jobId?, contextMode}
```

### Interviews
```
POST   /api/interviews                  Schedule interview (company only)
GET    /api/interviews/student          Student's scheduled interviews
GET    /api/interviews/company          Company's scheduled interviews
PATCH  /api/interviews/:id              Update status or add feedback
```

### Admin
```
GET    /api/admin/analytics             Full placement analytics with aggregations
GET    /api/admin/users                 All users with role filter and search
GET    /api/admin/activity-logs         Full audit trail with pagination
GET    /api/admin/export/applications.csv   Export all application data
GET    /api/admin/export/activity-logs.csv  Export audit logs
PATCH  /api/admin/users/:id/toggle      Activate or deactivate user
```

---

## 🧪 Running Tests

```bash
cd backend
npm test
```

Tests cover auth (register, login, JWT validation, role checks), jobs (CRUD, eligibility filtering), and applications (apply, duplicate prevention, CGPA check, status updates). 30+ integration tests using Jest and Supertest.

---

## 🚀 Deployment

The project is deployed across three platforms:

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | Auto-deploys on push to main |
| Backend | Render | Auto-deploys on push to main |
| AI Service | Render | Auto-deploys on push to main |
| Database | MongoDB Atlas | Cloud hosted |
| File Storage | Supabase | Cloud CDN |

### Deploy Frontend on Vercel

1. Import GitHub repo on vercel.com
2. Set Root Directory to `frontend`
3. Set Build Command to `npm run build`
4. Add environment variable `VITE_API_URL` pointing to your Render backend URL
5. Deploy

### Deploy Backend on Render

1. New Web Service — connect GitHub repo
2. Set Root Directory to `backend`
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Add all environment variables from `.env`

### Deploy AI Service on Render

1. New Web Service — same GitHub repo
2. Set Root Directory to `ai-service`
3. Build Command: `pip install -r requirements.txt && python model/train.py`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## 📁 Project Structure

```
PlaceIT/
├── frontend/                     React + Vite frontend
│   └── src/
│       ├── api/                  Axios API functions and bookmark utilities
│       ├── components/           Navbar, ErrorBoundary, Pagination, common UI
│       ├── context/              Auth, Socket, Theme contexts
│       └── pages/
│           ├── student/          Dashboard, Jobs, Calendar, SavedJobs,
│           │                     Applications, Profile, SkillGap
│           ├── company/          Dashboard (analytics), PostJob,
│           │                     Applicants, Interviews
│           └── admin/            Dashboard, Approvals, Analytics, Users
│
├── backend/                      Node.js + Express API
│   ├── config/                   MongoDB connection, Passport OAuth config
│   ├── models/                   User, Job, Application, Interview, ActivityLog
│   ├── routes/                   auth, jobs, applications, ai, interviews,
│   │                             admin, oauth
│   ├── middleware/               JWT auth, error handler, Supabase upload
│   ├── services/                 Email (Nodemailer), AI caller, WhatsApp (Twilio)
│   ├── utils/                    Activity logger, seed data
│   └── tests/                    Jest + Supertest integration tests
│
├── ai-service/                   Python FastAPI ML service
│   ├── main.py                   API endpoints
│   ├── scorer.py                 TF-IDF + ML scoring with fallback
│   ├── resume_parser.py          PDF/DOCX text extraction
│   └── model/train.py            Gradient Boosting model training
│
├── docker-compose.yml            Multi-service container setup
└── .github/workflows/ci.yml      GitHub Actions CI/CD pipeline
```

---

## 🔒 Security

- Passwords hashed with bcryptjs using 12 salt rounds — never stored in plain text
- JWT tokens with configurable expiry — access tokens stored in localStorage
- Password reset via time-limited cryptographic tokens (1 hour expiry)
- Email verification required before admin approval — prevents fake accounts
- Google OAuth via Passport.js — secure third-party authentication
- Rate limiting on authentication routes — 20 requests per 15 minutes in production
- HTTP security headers via Helmet — prevents XSS, clickjacking, MIME sniffing
- MongoDB query sanitization via mongo-sanitize — prevents NoSQL injection
- Role-based access control enforced on every protected API route
- React Error Boundaries — prevents white screen crashes from component errors

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

---

Built with care by [Shikha](https://github.com/Shikhha09)

⭐ Star this repo if you found it helpful!