<div align="center">

# ⚡ PlaceIT
### AI-Powered Campus Placement Portal

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-2563eb?style=for-the-badge&logo=vercel)](
place-it-ai-powered-campus-placemen.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/yourusername/placeit)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**A full-stack distributed system that replaces manual campus placement processes with an AI-powered platform featuring real-time notifications, ML-based candidate ranking, and comprehensive analytics.**

[View Demo](#demo) · [Features](#features) · [Tech Stack](#tech-stack) · [Setup](#setup) · [API Docs](#api-endpoints)

</div>

---

## 📸 Screenshots

| Student Dashboard (Dark) | AI Shortlisting | Admin Analytics |
|---|---|---|
| ![Student Dashboard](docs/student-dashboard.png) | ![AI Shortlist](docs/ai-shortlist.png) | ![Analytics](docs/analytics.png) |

---

## 🎯 Problem It Solves

Most college placement cells still run on **Excel sheets, WhatsApp groups, and paper forms**. This causes:

- Students missing drives due to late WhatsApp notifications
- TPOs spending 3–4 hours manually screening 150+ resumes per drive
- No visibility into application status — students call the TPO individually
- No data on placement trends — reports compiled manually at year end
- Companies receiving unsorted resume dumps with no ranking

**PlaceIT replaces this entire workflow** with a structured, AI-powered platform.

---

## ✨ Features

### 👨‍🎓 Student
- Role-based registration with admin approval flow
- Profile with CGPA, branch, skills, experience
- Resume upload (PDF/DOCX) with automatic text extraction
- Personalized job recommendations ranked by skill match
- Skill Gap Analyzer — see exactly what skills you're missing for any job
- Apply to jobs with automatic eligibility check (CGPA + branch)
- Real-time application status tracking
- Live notifications via Socket.io (no page refresh needed)
- Interview schedule tracking with Google Meet links

### 🏢 Company
- Post jobs with required skills, CGPA cutoff, branch eligibility
- View all applicants with AI-ranked scores
- **AI Shortlisting** — rank candidates using TF-IDF + ML in seconds
- Update application status with automated student notifications
- Schedule interviews directly (online/offline, with meet link)
- View interview pipeline per job

### 👨‍💼 Admin (TPO)
- Approve/reject student and company registrations
- Analytics dashboard with placement funnel, branch stats, company offers
- Export application data and audit logs as CSV
- User management with activate/deactivate
- Full activity audit trail — every action logged with timestamp
- Real-time overview of all placement activity

### 🤖 AI Service
- **TF-IDF Cosine Similarity** — matches resume text against job descriptions
- **Gradient Boosting Classifier** — predicts placement probability from CGPA + skills + experience
- **Skill keyword overlap** — exact matching between tagged skills and requirements
- **Explainable scores** — breakdown shows Skill Match %, CGPA Score, ML Confidence
- PDF and DOCX resume parsing for text extraction

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + Vite | UI framework with fast HMR |
| Tailwind CSS v3 | Utility-first styling with dark mode |
| React Router v6 | Client-side routing with protected routes |
| Socket.io Client | Real-time notifications |
| Recharts | Analytics charts (Bar, Pie, Funnel) |
| React Hook Form + Zod | Form handling and validation |
| Axios | HTTP client with JWT interceptor |

### Backend
| Technology | Purpose |
|---|---|
| Node.js 20 + Express 5 | REST API server |
| MongoDB + Mongoose | Database with schema validation |
| JWT + bcryptjs | Authentication and password hashing |
| Socket.io | WebSocket server for real-time events |
| Multer | File upload handling |
| Supabase Storage | Cloud file storage for resumes |
| Nodemailer | Transactional email with Gmail SMTP |
| Helmet + mongo-sanitize | Security headers and NoSQL injection prevention |
| express-rate-limit | Brute force protection |
| Jest + Supertest | Integration testing |

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
| Supabase Storage | Resume file storage |
| Vercel | Frontend deployment |
| Render | Backend + AI service deployment |
| Docker + Docker Compose | Containerization |
| GitHub Actions | CI/CD pipeline |

---

## 🏗️ Architecture

```
┌─────────────────────┐     HTTP/REST      ┌─────────────────────────┐
│   React Frontend    │ ◄─────────────────► │   Express Backend API   │
│   (Vercel)          │                     │   (Render)              │
│                     │   WebSocket         │                         │
│                     │ ◄─────────────────► │   Socket.io Server      │
└─────────────────────┘                     └────────────┬────────────┘
                                                         │ HTTP
                                            ┌────────────▼────────────┐
                                            │   Python AI Service     │
                                            │   (FastAPI on Render)   │
                                            └─────────────────────────┘
                                                         │
                              ┌──────────────────────────┼──────────────────┐
                              │                          │                  │
                   ┌──────────▼──────┐      ┌───────────▼──────┐  ┌────────▼────────┐
                   │  MongoDB Atlas  │      │ Supabase Storage │  │  Gmail SMTP     │
                   │  (Database)     │      │ (Resume Files)   │  │  (Emails)       │
                   └─────────────────┘      └──────────────────┘  └─────────────────┘
```

---

## 🔄 How It Works

### AI Shortlisting Pipeline
```
Company clicks "AI Shortlist"
        ↓
Express fetches all applicants from MongoDB
        ↓
Sends to FastAPI: { candidates[], job{} }
        ↓
FastAPI runs 3 scoring signals:
  1. TF-IDF cosine similarity (resume text vs job description) — 40% weight
  2. Skill keyword overlap (tagged skills vs required skills) — part of 40%
  3. Gradient Boosting ML model (CGPA + skills + experience) — 30% weight
  4. CGPA normalized score — 30% weight
        ↓
Returns ranked list with scores 0-100 + breakdown
        ↓
Express saves scores to MongoDB
        ↓
Company sees ranked candidates instantly
```

### Real-Time Notification Flow
```
Company updates status → Express saves to DB
        ↓
io.to(studentId).emit("notification", { message })
        ↓
Student's browser receives via WebSocket
        ↓
Toast popup + bell badge updates instantly
No page refresh needed
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 20+
- Python 3.11+
- MongoDB (local or Atlas)
- Git

### Clone the Repository
```bash
git clone https://github.com/yourusername/placeit.git
cd placeit
```

### Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your values (see Environment Variables section)
npm install
npm run seed    # Load demo data
npm run dev     # Starts on http://localhost:5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev     # Starts on http://localhost:5173
```

### AI Service Setup
```bash
cd ai-service
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
python model/train.py    # Train ML model once
uvicorn main:app --reload --port 8000
```

### Or Use Docker (runs everything with one command)
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

# MongoDB
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/campus_placement

# JWT
JWT_SECRET=your_64_char_random_hex_string
JWT_EXPIRE=7d

# Supabase Storage (for resume uploads)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_BUCKET=resumes

# Gmail SMTP (for email notifications)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your@gmail.com
MAIL_PASS=your_16_char_app_password
MAIL_FROM=your@gmail.com

# AI Service
AI_SERVICE_URL=http://localhost:8000

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🎭 Demo Accounts

After running `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Admin (TPO) | admin@campus.local | Password@123 |
| Company | hr@technova.com | Password@123 |
| Company | recruit@infosys.com | Password@123 |
| Student | aarav@student.edu | Password@123 |
| Student | priya@student.edu | Password@123 |
| Student | rohan@student.edu | Password@123 |

---

## 📡 API Endpoints

### Auth
```
POST   /api/auth/register              Register student or company
POST   /api/auth/login                 Login and get JWT
GET    /api/auth/me                    Get current user
GET    /api/auth/pending               Get pending approvals (admin)
PATCH  /api/auth/approve/:id           Approve/reject user (admin)
PATCH  /api/auth/student-profile       Update student profile
PATCH  /api/auth/student-resume        Upload resume (multipart)
```

### Jobs
```
GET    /api/jobs                       List jobs (with eligibility filter)
POST   /api/jobs                       Post new job (company)
PUT    /api/jobs/:id                   Update job (company)
DELETE /api/jobs/:id                   Delete job (company/admin)
GET    /api/jobs/recommended           Personalized recommendations (student)
GET    /api/jobs/:id/skill-gap         Skill gap analysis (student)
GET    /api/jobs/company/mine          Company's own jobs
```

### Applications
```
POST   /api/applications               Apply to job (student)
GET    /api/applications/mine          Student's applications
GET    /api/applications/job/:jobId    Applicants for a job (company)
PATCH  /api/applications/:id/status   Update status (company/admin)
```

### AI
```
POST   /api/ai/shortlist/:jobId        Rank candidates with AI
GET    /api/ai/health                  AI service health check
```

### Interviews
```
POST   /api/interviews                 Schedule interview (company)
GET    /api/interviews/student         Student's interviews
GET    /api/interviews/company         Company's interviews
PATCH  /api/interviews/:id             Update interview status
```

### Admin
```
GET    /api/admin/analytics            Placement analytics
GET    /api/admin/users                All users with filters
GET    /api/admin/activity-logs        Audit trail
GET    /api/admin/export/applications.csv    Export data
GET    /api/admin/export/activity-logs.csv   Export logs
PATCH  /api/admin/users/:id/toggle     Activate/deactivate user
```

---

## 🧪 Running Tests

```bash
cd backend
npm test
```

Tests cover:
- Auth: register, login, JWT validation, role checks
- Jobs: CRUD, eligibility filtering, recommendations  
- Applications: apply, duplicate prevention, CGPA check, status updates

---

## 🚀 Deployment

### Frontend → Vercel
1. Import GitHub repo on [vercel.com](https://vercel.com)
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Add env: `VITE_API_URL=https://your-backend.onrender.com/api`

### Backend → Render
1. New Web Service on [render.com](https://render.com)
2. Root directory: `backend`
3. Start command: `node server.js`
4. Add all env variables from `.env`

### AI Service → Render
1. New Web Service
2. Root directory: `ai-service`
3. Build: `pip install -r requirements.txt && python model/train.py`
4. Start: `uvicorn main:app --host 0.0.0.0 --port 8000`

---

## 📁 Project Structure

```
placeit/
├── frontend/                    # React + Vite
│   └── src/
│       ├── api/                 # Axios API functions
│       ├── components/          # Navbar, common components
│       ├── context/             # Auth, Socket, Theme contexts
│       └── pages/
│           ├── student/         # Dashboard, Jobs, Applications, Profile, SkillGap
│           ├── company/         # Dashboard, PostJob, Applicants, Interviews
│           └── admin/           # Dashboard, Approvals, Analytics, Users
│
├── backend/                     # Node.js + Express
│   ├── config/                  # MongoDB connection
│   ├── models/                  # User, Job, Application, Interview, ActivityLog
│   ├── routes/                  # auth, jobs, applications, ai, interviews, admin
│   ├── middleware/               # JWT auth, error handler, file upload
│   ├── services/                # Email, AI caller
│   ├── utils/                   # Activity logger, seed data
│   └── tests/                   # Jest integration tests
│
├── ai-service/                  # Python FastAPI
│   ├── main.py                  # API endpoints
│   ├── scorer.py                # TF-IDF + ML ranking
│   ├── resume_parser.py         # PDF/DOCX text extraction
│   └── model/train.py           # ML model training
│
├── docker-compose.yml           # Multi-service container setup
└── .github/workflows/ci.yml     # GitHub Actions CI/CD
```

---

## 🔒 Security

- JWT authentication with configurable expiry
- Passwords hashed with bcryptjs (12 salt rounds)
- Rate limiting on auth routes (20 req/15min in production)
- HTTP security headers via Helmet
- NoSQL injection prevention via mongo-sanitize
- Input validation on all API endpoints
- Role-based access control on every protected route

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ by [Shikha Gupta](https://github.com/Shikhha09)

⭐ Star this repo if you found it helpful!

</div>
