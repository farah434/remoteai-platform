<<<<<<< HEAD
# RemoteAI — AI-Powered Remote Jobs Platform

> Full-stack job platform with AI skill matching, career mentoring, and CV analysis.

## 🚀 Quick Start (Frontend)

```bash
npm install
npm run dev
```
Open http://localhost:5173

## 🗂 Project Structure

```
remote-jobs-ai/
├── src/
│   ├── pages/          # All page components
│   │   ├── Home.jsx    # Landing page + featured jobs
│   │   ├── Jobs.jsx    # Job listing + filters
│   │   ├── Login.jsx   # Auth
│   │   ├── Signup.jsx  # 2-step onboarding with skill picker
│   │   └── Profile.jsx # AI dashboard
│   ├── components/
│   │   ├── Navbar.jsx  # Sticky nav
│   │   ├── JobCard.jsx # Card with AI match score
│   │   ├── JobModal.jsx# Detail view + skill gap
│   │   └── Chatbot.jsx # AI career mentor chat
│   ├── context/
│   │   └── AuthContext.jsx  # User state + localStorage
│   ├── utils/
│   │   └── matching.js # AI matching engine
│   ├── data/
│   │   └── jobs.js     # Job listings + skill categories
│   └── styles/
│       └── global.css  # Full design system
├── server.js           # Phase 4 backend (Node + Express + MongoDB)
└── .env.example        # Backend environment vars
```

## ✅ Phase Progress

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Done | Landing page, hero, job cards, CSS |
| 2 | ✅ Done | React Router, all pages, navigation |
| 3 | ✅ Done | AI matching, filters, skill gap, chatbot |
| 4 | 📄 Ready | Backend code written — needs MongoDB |
| 5 | 🔜 Next | Real jobs DB, API filters |
| 6 | 🔜 Next | CV upload, ATS score |
| 7 | 🔜 Next | Real AI chatbot via API |
| 8–10 | 🔜 Later | Notifications, monetization, admin |

## 🔵 Phase 4 Setup (Backend)

```bash
# 1. Install backend deps
npm install bcryptjs cors dotenv express jsonwebtoken mongoose

# 2. Copy env file
cp .env.example .env

# 3. Set your MongoDB URI in .env

# 4. Run server
node server.js
```

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/signup | Register user |
| POST | /api/auth/login | Login + JWT |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/skills | Update user skills |
| GET | /api/jobs | List jobs (with filters) |
| GET | /api/jobs/:id | Single job |
| POST | /api/jobs | Create job (admin) |

## 🤖 AI Features (Phase 3 — Frontend)

- **Match Score**: Compares user skills to job requirements (0–99%)
- **Skill Gap Detection**: Shows missing skills per job
- **Career Suggestions**: Recommends next skills to learn
- **Smart Sorting**: Jobs ranked by AI match score
- **Career Chatbot**: Answers career questions in Urdu/English

## 🎨 Design System

- **Dark theme** with zinc/slate base
- **Accent**: Indigo (#6366f1) + Pink gradient
- **Typography**: Inter system font
- **Fully responsive** — mobile + desktop
=======
# remoteai-platform
AI-powered remote jobs platform with smart job matching, CV analysis, career roadmap, and AI career recommendations.
>>>>>>> fc314ff6de32772bd065aead65ef69c8ebfa9e3c
