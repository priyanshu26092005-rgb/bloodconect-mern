# BloodConnect — MERN Blood Donation Management System

A beginner-friendly MERN starter with donor registration, requester accounts, blood requests, opt-in donor search by blood group/city/PIN code, admin statistics and request verification, SMTP email notifications (optional), and Socket.IO live request updates.

## Requirements
- Node.js 20 LTS or newer
- MongoDB Community Server running locally, or a MongoDB Atlas connection string
- VS Code (recommended)

## 1. Configure the backend
Open a terminal in `server`:

```bash
npm install
```

Copy `.env.example` to `.env` and edit it. On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Set at minimum:
- `MONGODB_URI` — local MongoDB URL or Atlas connection string
- `JWT_SECRET` — a long, random secret (do not commit `.env`)
- `CLIENT_URL=http://localhost:5173`
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` — use a strong private password

Create the admin account once:

```bash
npm run seed-admin
```

Start the API:

```bash
npm run dev
```

API health check: http://localhost:5000/api/health

## 2. Start the frontend
Open a second terminal in `client`:

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally http://localhost:5173).

## 3. Try the project
1. Create a donor account and opt in to being discoverable.
2. Create a requester account in another browser/incognito window.
3. Submit a blood request using a future date/time, city and six-digit PIN code.
4. Log in as the donor and browse the request board. Express interest in a matching request.
5. Log in as the admin using `ADMIN_EMAIL` and `ADMIN_PASSWORD`, and open Admin dashboard to review stats and verify requests.

## 4. Optional email notifications
Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM` in `server/.env`. Use credentials/app passwords from a mail provider and never commit them. If SMTP is not configured, the app logs a note in the backend terminal instead of sending email.

## Main API routes
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/me`
- `GET /api/donors?bloodGroup=B%2B&city=Bareilly&pinCode=243001`
- `GET /api/requests`, `POST /api/requests`, `POST /api/requests/:id/interest`, `PATCH /api/requests/:id/status`
- `GET /api/admin/stats`, `PATCH /api/admin/requests/:id/verify`

## Important notes before production
This is a college-project starter, not a medical or hospital-grade system. It does not determine clinical eligibility or transfusion compatibility. A blood bank/qualified professional must confirm both. Do not expose donor phone numbers or private contact details publicly. Add rate limiting, email verification, password reset, audit logs, stronger request verification, secure cookie/session decisions, deployment secrets, HTTPS and automated tests before production. Consider making request access and contact exchange consent-based and reviewed by your institution.
