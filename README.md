
# gov-scheme-finder
# Government Scheme Finder
🔗 Live: https://gov-scheme-finder-gilt.vercel.app

A medium-size full-stack application to discover and track government schemes.

## Tech Stack
- Frontend: React + Vite + Axios
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL (Neon free tier recommended)
- Auth: JWT (Bearer token), role-based (`admin`, `user`)
- Hosting: Vercel (frontend) + Render (backend) + Neon (database)

## Core Features
- User registration and login
- Role-based access control
- Admin-only scheme create/edit/delete
- Scheme list with search/filter/pagination/sort
- Eligibility checker with explanation (why eligible/not)
- User bookmarks stored in DB
- User application tracking stored in DB
- CSV export for current scheme list
- Dashboard cards and category chart

## API Endpoints
### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

### Schemes
- `GET /api/v1/schemes`
- `GET /api/v1/schemes/{scheme_id}`
- `POST /api/v1/schemes` (admin)
- `PUT /api/v1/schemes/{scheme_id}` (admin)
- `DELETE /api/v1/schemes/{scheme_id}` (admin)

### Eligibility
- `POST /api/v1/eligibility`

### Bookmarks
- `GET /api/v1/bookmarks`
- `POST /api/v1/bookmarks`
- `DELETE /api/v1/bookmarks/{scheme_id}`

### Applications
- `GET /api/v1/applications`
- `POST /api/v1/applications`

## Local Setup
### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

## Environment Variables
### backend/.env
- `DATABASE_URL=postgresql+psycopg://...`
- `JWT_SECRET_KEY=...`
- `JWT_ALGORITHM=HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES=1440`

### frontend/.env
- `VITE_API_URL=http://localhost:8000`

## Free Deployment Guide

### 1) Neon (Free PostgreSQL)
- Create project in Neon
- Copy connection string
- Use it as `DATABASE_URL` in Render

### 2) Render (Free backend)
- Connect GitHub repo
- Create Web Service
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add env vars:
  - `DATABASE_URL`
  - `JWT_SECRET_KEY`
  - `JWT_ALGORITHM=HS256`
  - `ACCESS_TOKEN_EXPIRE_MINUTES=1440`

### 3) Vercel (Free frontend)
- Import GitHub repo
- Root directory: `frontend`
- Build command: `npm run build`
- Output: `dist`
- Add env var:
  - `VITE_API_URL=https://<your-render-service>.onrender.com`

## Notes
- First registered user becomes `admin`; later users become `user`.
- Free Render services spin down on idle and may cold start.
- For long-term scale, keep Neon and upgrade Render plan when needed.
 216434c (Deploy-ready Government Scheme Finder)
