<div align="center">
⚡ PlaceIT
AI-Powered Campus Placement Portal
![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-2563eb?style=for-the-badge&logo=vercel)
![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
A full-stack distributed system that replaces manual campus placement processes — Excel sheets, WhatsApp groups, and paper forms — with an AI-powered platform featuring ML candidate ranking, real-time notifications, placement calendar, and WhatsApp alerts.
View Demo · Features · Tech Stack · Setup · API Docs
</div>
---
✨ Features
👨‍🎓 Student
Role-based registration with email verification + admin approval
Profile with CGPA, branch, skills, experience, LinkedIn, GitHub, WhatsApp number
Resume upload (PDF/DOCX) with automatic text extraction and parse validation
Personalized job recommendations ranked by skill match %
Skill Gap Analyzer — see exactly what skills you're missing for any job
Apply to jobs with automatic CGPA + branch eligibility check
Placement Drive Calendar — monthly/weekly/agenda view of all drives
Job Bookmarking — save jobs to apply later
Real-time application status tracking with pipeline progress bar
Live Socket.io notifications — no page refresh needed
Interview schedule tracking with Google Meet links
AI Score visible on each application (Skill Match, CGPA, ML Confidence)
🏢 Company
Post jobs with required skills, CGPA cutoff, branch eligibility, deadline
View all applicants with AI-ranked scores and score breakdown
AI Shortlisting — rank 150+ candidates using TF-IDF + ML in seconds
Graceful fallback ranking when AI service is unavailable
Update application status with automated email + WhatsApp notifications
Schedule interviews directly (online/offline, with meet link or venue)
Analytics Dashboard — applicants per job chart, status breakdown pie chart
Status update loading state — prevents double-submit
👨‍💼 Admin (TPO)
Approve/reject student and company registrations
View only email-verified accounts in pending list
Analytics dashboard — placement funnel, branch-wise stats, company offers (Recharts)
Export application data and audit logs as CSV (with JWT auth token)
User management with activate/deactivate
Full activity audit trail — every action logged with timestamp, exportable
🔐 Security & Auth
JWT authentication (configurable expiry)
bcryptjs password hashing (12 salt rounds)
Password reset flow — forgot password email with 1-hour expiry token
Email verification on registration — only verified accounts shown to admin
Google OAuth login — one-click Google sign-in
Rate limiting on auth routes (disabled in development, strict in production)
HTTP security headers (Helmet), NoSQL injection prevention (mongo-sanitize)
Role-based access control on every protected route
Error boundaries — no white screen crashes in production
🤖 AI Service (Python FastAPI)
TF-IDF Cosine Similarity — resume text vs job description semantic matching
Gradient Boosting Classifier — 87% accuracy placement prediction ML model
Skill keyword overlap scoring
Explainable scores — Skill Match %, CGPA Score, ML Confidence breakdown
Resume text extraction from PDF (pdfplumber) and DOCX (python-docx)
Resume parse warning — alerts student if text extraction failed
Graceful fallback — CGPA + skill ranking when AI service is sleeping
📱 Notifications
Real-time Socket.io notifications (bell icon + toast)
Email notifications (Gmail SMTP) — application received, status updated, interview scheduled, account approved
WhatsApp notifications (Twilio) — instant WhatsApp messages on status changes and interview schedules
---
🛠️ Tech Stack
Frontend
Technology	Purpose
React 18 + Vite	UI framework with fast HMR
Tailwind CSS v3	Utility-first styling with dark mode
React Router v6	Client-side routing with protected routes
Socket.io Client	Real-time notifications
Recharts	Analytics charts (Bar, Pie, Funnel)
react-big-calendar	Placement drive calendar
React Hook Form + Zod	Form handling and validation
Axios	HTTP client with JWT interceptor
date-fns	Date formatting for calendar
Backend
Technology	Purpose
Node.js 20 + Express 5	REST API server
MongoDB + Mongoose	Database with schema validation
JWT + bcryptjs	Authentication and password hashing
Passport + passport-google-oauth20	Google OAuth login
Socket.io	WebSocket server for real-time events
Multer	File upload handling
Supabase Storage	Cloud file storage for resumes
Nodemailer	Transactional email (Gmail SMTP)
Twilio	WhatsApp notifications
Helmet + mongo-sanitize	Security headers + NoSQL injection prevention
express-rate-limit	Brute force protection
Jest + Supertest	Integration testing (30+ tests)
AI Service
Technology	Purpose
Python 3.11 + FastAPI	Async API for ML inference
scikit-learn	Gradient Boosting Classifier
TF-IDF Vectorizer	Resume-to-job description similarity
pdfplumber	PDF text extraction
python-docx	DOCX text extraction
joblib	ML model serialization
Infrastructure
Technology	Purpose
MongoDB Atlas	Cloud database
Supabase Storage	Resume file storage
Vercel	Frontend deployment
Render	Backend + AI service deployment
Docker + Docker Compose	Containerization
GitHub Actions	CI/CD pipeline
---
🏗️ Architecture
```
┌─────────────────────┐     HTTP/REST      ┌─────────────────────────┐
│   React Frontend    │ ◄─────────────────► │   Express Backend API   │
│   (Vercel)          │   WebSocket (WS)    │   (Render)              │
└─────────────────────┘ ◄─────────────────► └────────────┬────────────┘
                                                         │ HTTP
                                            ┌────────────▼────────────┐
                                            │   Python AI Service     │
                                            │   (FastAPI on Render)   │
                                            └─────────────────────────┘
                          ┌──────────────────────────┬──────────────────┬────────────────┐
                          │                          │                  │                │
               ┌──────────▼──────┐      ┌───────────▼──────┐  ┌────────▼──────┐ ┌──────▼──────┐
               │  MongoDB Atlas  │      │ Supabase Storage │  │  Gmail SMTP   │ │   Twilio    │
               │  (Database)     │      │ (Resume Files)   │  │  (Emails)     │ │ (WhatsApp)  │
               └─────────────────┘      └──────────────────┘  └───────────────┘ └─────────────┘
```
---
⚙️ Setup & Installation
Prerequisites
Node.js 20+
Python 3.11+
MongoDB (local or Atlas)
Git
Clone the Repository
```bash
git clone https://github.com/Shikhha09/PlaceIT-AI-Powered-Campus-Placement-Portal.git
cd PlaceIT-AI-Powered-Campus-Placement-Portal
```
Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your values (see Environment Variables section)
npm install
npm run seed    # Load demo data
npm run dev     # Starts on http://localhost:5000
```
Frontend Setup
```bash
cd frontend
npm install
npm run dev     # Starts on http://localhost:5173
```
AI Service Setup
```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
python model/train.py        # Train ML model once
uvicorn main:app --reload --port 8000
```
---
🔑 Environment Variables
`backend/.env`
```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/campus_placement

# JWT
JWT_SECRET=your_64_char_random_hex_string
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
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SERVER_URL=http://localhost:5000

# Twilio WhatsApp (optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# AI Service
AI_SERVICE_URL=http://localhost:8000

# Frontend URL (CORS)
CLIENT_URL=http://localhost:5173
```
`frontend/.env`
```env
VITE_API_URL=http://localhost:5000/api
```
---
🎭 Demo Accounts
After running `npm run seed`:
Role	Email	Password
Admin (TPO)	admin@campus.local	Password@123
Company	hr@technova.com	Password@123
Company	recruit@infosys.com	Password@123
Student	aarav@student.edu	Password@123
Student	priya@student.edu	Password@123
Student	rohan@student.edu	Password@123
Or use the one-click demo buttons on the login page.
---
📡 API Endpoints
Auth
```
POST   /api/auth/register                Register student or company
POST   /api/auth/login                   Login and get JWT
GET    /api/auth/me                      Get current user
GET    /api/auth/pending                 Pending approvals (admin)
PATCH  /api/auth/approve/:id             Approve/reject user (admin)
PATCH  /api/auth/student-profile         Update student profile
PATCH  /api/auth/student-resume          Upload resume (multipart)
POST   /api/auth/forgot-password         Send password reset email
POST   /api/auth/reset-password/:token   Reset password
GET    /api/auth/verify-email/:token     Verify email address
GET    /api/auth/google                  Google OAuth redirect
GET    /api/auth/google/callback         Google OAuth callback
```
Jobs
```
GET    /api/jobs                         List jobs (eligibility filtered + paginated)
POST   /api/jobs                         Post new job (company)
PUT    /api/jobs/:id                     Update job (company)
DELETE /api/jobs/:id                     Delete job (company/admin)
GET    /api/jobs/recommended             AI-ranked recommendations (student)
GET    /api/jobs/:id/skill-gap           Skill gap analysis (student)
GET    /api/jobs/company/mine            Company's own jobs
```
Applications
```
POST   /api/applications                 Apply to job (student)
GET    /api/applications/mine            Student's applications
GET    /api/applications/job/:jobId      Applicants for a job (company)
PATCH  /api/applications/:id/status      Update status (company/admin)
```
AI
```
POST   /api/ai/shortlist/:jobId          Rank candidates (with fallback)
GET    /api/ai/health                    AI service health check
```
Interviews
```
POST   /api/interviews                   Schedule interview (company)
GET    /api/interviews/student           Student's interviews
GET    /api/interviews/company           Company's interviews
PATCH  /api/interviews/:id               Update interview status
```
Admin
```
GET    /api/admin/analytics              Placement analytics
GET    /api/admin/users                  All users with filters
GET    /api/admin/activity-logs          Audit trail
GET    /api/admin/export/applications.csv
GET    /api/admin/export/activity-logs.csv
PATCH  /api/admin/users/:id/toggle       Activate/deactivate user
```
---
🧪 Running Tests
```bash
cd backend
npm test
```
30+ integration tests covering auth, jobs, and applications.
---
🚀 Deployment
Service	Platform	URL
Frontend	Vercel	Auto-deploy on push to main
Backend	Render	Auto-deploy on push to main
AI Service	Render	Auto-deploy on push to main
Database	MongoDB Atlas	Cloud hosted
Files	Supabase Storage	Cloud CDN
---
📁 Project Structure
```
placeit/
├── frontend/                    # React + Vite
│   └── src/
│       ├── api/                 # Axios API functions + bookmark utils
│       ├── components/          # Navbar, common, ErrorBoundary, Pagination
│       ├── context/             # Auth, Socket, Theme contexts
│       └── pages/
│           ├── student/         # Dashboard, Jobs, Calendar, SavedJobs,
│           │                    # Applications, Profile, SkillGap
│           ├── company/         # Dashboard (analytics), PostJob,
│           │                    # Applicants, Interviews
│           └── admin/           # Dashboard, Approvals, Analytics, Users
│
├── backend/                     # Node.js + Express
│   ├── config/                  # DB + Passport config
│   ├── models/                  # User, Job, Application, Interview, ActivityLog
│   ├── routes/                  # auth, jobs, applications, ai, interviews,
│   │                            # admin, oauth
│   ├── middleware/               # JWT auth, error handler, file upload
│   ├── services/                # Email, AI caller, WhatsApp
│   ├── utils/                   # Activity logger, seed data
│   └── tests/                   # Jest integration tests
│
├── ai-service/                  # Python FastAPI
│   ├── main.py                  # API endpoints
│   ├── scorer.py                # TF-IDF + ML ranking + fallback
│   ├── resume_parser.py         # PDF/DOCX text extraction
│   └── model/train.py           # ML model training
│
├── docker-compose.yml
└── .github/workflows/ci.yml
```
---
🔒 Security
JWT auth with configurable expiry
bcrypt password hashing (12 salt rounds)
Password reset with time-limited tokens (1 hour)
Email verification before admin approval
Google OAuth for frictionless secure login
Rate limiting (production only)
HTTP security headers (Helmet)
NoSQL injection prevention (mongo-sanitize)
Role-based access control on every route
Error boundaries — no white screen crashes
---
📄 License
MIT License — see LICENSE for details.
---
<div align="center">
Built with ❤️ by Shikha
⭐ Star this repo if you found it helpful!
</div>