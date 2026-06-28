# 🚀 RemoteAI — Deployment Guide

## Overview

| Layer     | Service         | Free Tier | URL example |
|-----------|-----------------|-----------|-------------|
| Frontend  | Vercel          | ✅ Yes    | `remoteai.vercel.app` |
| Backend   | Railway         | ✅ Yes    | `remoteai-api.railway.app` |
| Database  | MongoDB Atlas   | ✅ Yes    | Atlas M0 (512 MB free) |

---

## Step 1 — MongoDB Atlas (Database)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → **Create a free cluster** (M0)
2. **Database Access** → Add user → set username + password
3. **Network Access** → Add IP → Allow from anywhere (`0.0.0.0/0`)
4. **Connect** → Drivers → Node.js → copy the URI

```
mongodb+srv://youruser:yourpassword@cluster0.abc123.mongodb.net/remoteai?retryWrites=true&w=majority
```

---

## Step 2 — Backend on Railway

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
2. Connect your GitHub repo
3. Set **Start Command**: `node server.js`
4. Under **Variables**, add:

```env
MONGO_URI=<your Atlas URI>
JWT_SECRET=<a long random string>
PORT=5000
GEMINI_API_KEY=<optional — leave blank to use fallback>
```

5. **Deploy** → Railway gives you a public URL like `https://remoteai-api.railway.app`

---

## Step 3 — Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project → Import from GitHub**
2. Set **Framework**: Vite
3. Under **Environment Variables**, add:

```env
VITE_API_URL=https://remoteai-api.railway.app
```

4. **Deploy** → Vercel gives you `https://remoteai.vercel.app`

> `vercel.json` is already in the root — it handles React Router rewrites automatically.

---

## Step 4 — Verify Deployment

### Backend health check
```
GET https://remoteai-api.railway.app/api/health
```
Should return:
```json
{ "status": "ok", "ai": "Gemini connected", "jobs": { "total": 8 } }
```

### Frontend
Open `https://remoteai.vercel.app` — login, browse jobs, check Profile dashboard.

---

## Optional: Custom Domain

- **Vercel**: Project Settings → Domains → Add your domain
- **Railway**: Settings → Networking → Custom Domain

---

## Updating

Push to `main` → both Vercel and Railway auto-deploy. Zero downtime on Vercel.

---

## Environment Variables Summary

| Variable         | Where    | Description |
|-----------------|----------|-------------|
| `MONGO_URI`      | Railway  | MongoDB Atlas connection string |
| `JWT_SECRET`     | Railway  | Auth token signing secret |
| `PORT`           | Railway  | Server port (Railway sets this automatically) |
| `GEMINI_API_KEY` | Railway  | Google Gemini AI key (optional) |
| `VITE_API_URL`   | Vercel   | Full URL of your Railway backend |

---

## Gemini API Key (optional but recommended)

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. **Get API Key** → copy it
3. Add to Railway environment variables as `GEMINI_API_KEY`

Without this key, the app still works — all AI features fall back to smart local logic.
