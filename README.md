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

> **Live Demo:** [placeit-ai-powered-campus-placemen.vercel.app](https://placeit-ai-powered-campus-placemen.vercel.app)
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