# InterviewIQ - MERN Stack Final Project

InterviewIQ is a full-stack MERN application for interview preparation. It covers secure auth, OTP/email flows, CRUD operations, search/filter, uploads, analytics reports, and premium checkout.

## 1) Project Objective Coverage

### Mandatory
- Secure authentication and user management (JWT + bcrypt)
- OTP verification and email integration
- Forgot/reset/change password
- CRUD operations with REST APIs
- Search and filter
- Image/file upload (Multer + Cloudinary / local fallback)
- Aggregation and reporting
- Multi-collection joins (`$lookup`)
- Responsive React frontend with reusable components
- Toast notifications for success/error

### Bonus Implemented
- Stripe checkout integration
- Charts/graphs with Recharts
- Dark mode theme toggle
- Report export (PDF + XLSX + JSON)

## 2) Tech Stack
- MongoDB (Mongoose)
- Express.js + Node.js
- React + Vite
- Tailwind CSS
- Axios
- React Router
- React Toastify
- Stripe
- Recharts

## 3) Folder Structure

```text
interviewiq/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      utils/
      app.js
      server.js
  frontend/
    src/
      components/
      context/
      pages/
      services/
      utils/
      App.jsx
      main.jsx
```

## 4) Environment Variables

### Backend (`backend/.env`)

```env
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:5173
OTP_EMAIL_TIMEOUT_MS=20000
OTP_RESEND_COOLDOWN_MS=60000
MONGODB_URI=<your_mongodb_connection_string>

JWT_SECRET=<long_random_secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<different_long_random_secret>
JWT_REFRESH_EXPIRES_IN=7d

EMAIL_SERVICE=gmail
EMAIL_USER=<your_gmail_address@gmail.com>
EMAIL_PASS=<your_16_character_gmail_app_password>
SENDGRID_API_KEY=
EMAIL_FROM=<your_gmail_address@gmail.com>
EMAIL_FROM_NAME=InterviewIQ

CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Note:
- The app sends mail with Nodemailer using Gmail service mode and a Gmail App Password.
- Use `EMAIL_SERVICE=gmail`, `EMAIL_USER=<your_gmail_address>`, and `EMAIL_PASS=<your_16_character_gmail_app_password>` for both development and production.
- Keep `EMAIL_FROM` the same as `EMAIL_USER`.
- Do not set `EMAIL_HOST`, `EMAIL_PORT`, or `EMAIL_SECURE` when using Gmail app-password mode.
- `OTP_EMAIL_TIMEOUT_MS` limits how long signup / verify / forgot-password OTP mail requests can block the response when email delivery is slow.
- `OTP_RESEND_COOLDOWN_MS` adds a cooldown (in ms) before another OTP can be requested for the same account.
- If you use MongoDB Atlas, whitelist your current IP in Atlas Network Access or the backend cannot start.

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 5) Run Locally

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 5.5) Email Setup (Gmail OTP & Verification)

If sign-up is failing with "Connection timeout" or "502 error", your email config needs updating.

**Quick Fix (5 minutes):**

1. Enable 2-Factor Authentication on your Gmail account
2. Generate a 16-character app password at https://myaccount.google.com/apppasswords
3. Add to `backend/.env`:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=xxxx xxxx xxxx xxxx  (paste the app password, no spaces)
   ```
4. Restart backend: `npm run dev`
5. Test sign-up again

## 7) Stripe Webhook (Local)

```bash
stripe login
stripe listen --forward-to localhost:4000/api/payments/webhook
```

Copy the printed `whsec_...` to `STRIPE_WEBHOOK_SECRET` in `backend/.env`.

## 8) Deployment

Fill these when deployed:

- Frontend URL (Vercel/Netlify): `https://interview-iq-ruddy-one.vercel.app`
- Backend URL (Render/Railway): `https://interviewiq-backend-lzdm.onrender.com`

Recommended production variables:

### Backend host

```env
NODE_ENV=production
PORT=4000
CLIENT_URL=https://<your-frontend-url>
OTP_EMAIL_TIMEOUT_MS=20000
OTP_RESEND_COOLDOWN_MS=60000
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<long_random_secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<different_long_random_secret>
JWT_REFRESH_EXPIRES_IN=7d
EMAIL_SERVICE=gmail
EMAIL_USER=<your_gmail_address@gmail.com>
EMAIL_PASS=<your_16_character_gmail_app_password>
EMAIL_FROM=<your_gmail_address@gmail.com>
EMAIL_FROM_NAME=InterviewIQ
CLOUDINARY_CLOUD_NAME=<cloud_name>
CLOUDINARY_API_KEY=<api_key>
CLOUDINARY_API_SECRET=<api_secret>
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend host

```env
VITE_API_BASE_URL=https://<your-backend-url>/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...
```

Deployment checklist:

1. Push the latest code to GitHub.
2. Redeploy the backend first so auth/email route changes go live before the frontend points to them.
3. Confirm the frontend `VITE_API_BASE_URL` points to the deployed backend `/api` URL.
4. Confirm backend `CLIENT_URL` exactly matches the deployed frontend origin and is one clean absolute URL.
5. Do not commit real `.env` files to GitHub. Commit only `.env.example`.
6. If secrets were already committed, rotate MongoDB, Gmail, Cloudinary, Stripe, and JWT secrets before redeploying.

## 9) Submission Checklist

### Frontend

| Requirement | Status |
|---|---|
| Responsive Design | Done |
| Reusable Components | Done |
| React Hooks | Done |
| Context API / Redux | Done (Context API) |
| Routing (React Router) | Done |
| API Integration (Axios) | Done |
| Toast / Alerts | Done |

### Backend

| Requirement | Status |
|---|---|
| User Authentication (JWT) | Done |
| OTP & Email Verification | Done |
| Forgot / Change Password | Done |
| CRUD Operations | Done |
| Search & Filter | Done |
| Image Upload | Done |
| Aggregation / Reports | Done |
| Join (Multiple Collections) | Done |

### Deployment & Docs

| Requirement | Status |
|---|---|
| Frontend Hosted | Done (`https://interview-iq-ruddy-one.vercel.app`, verified reachable on March 31, 2026) |
| Backend Hosted | Done (`https://interviewiq-backend-lzdm.onrender.com`, `/health` verified on March 31, 2026) |
| GitHub Repo Link | Done (`https://github.com/mufeedha-tm/interview-iq`) |
| README with Screenshots | Done (`docs/screenshots/signup.png`, `dashboard.png`, `session.png`, and `results.png` present) |
| Short Demo Video (2–3 min) | Pending manual submission step |

### Bonus

| Feature | Status |
|---|---|
| Payment Integration (Stripe) | Done |
| Charts / Graphs | Done |
| Dark Mode | Done |
| Export Reports | Done (PDF + XLSX + JSON) |

## 10) Build & Lint Verification

- Frontend lint: `npm run lint` -> pass
- Frontend production build: `npm run build` -> pass
- Verification date: April 6, 2026

## 11) Remaining Manual Submission Items

These items are not generated by the codebase and still need to be added by you before final submission:

- Record a 2-3 minute demo video covering signup/login, interview flow, results/reporting, and deployment links.
- Recheck deployed URLs after your final submission push:
  Frontend `https://interview-iq-ruddy-one.vercel.app`
  Backend `https://interviewiq-backend-lzdm.onrender.com`

## 12) Screenshots

Submission screenshots currently included from `docs/screenshots/`:

![Signup Page](./docs/screenshots/signup.png)
![Dashboard](./docs/screenshots/dashboard.png)
![Interview Session](./docs/screenshots/session.png)
![Results + Export](./docs/screenshots/results.png)

Recommended capture set:

- `signup.png`: signup form with OTP/email verification flow visible
- `dashboard.png`: dashboard with analytics, leaderboard, and summary cards
- `session.png`: live interview session with question prompt, timer, and recording area
- `results.png`: results page with rubric, strengths/improvements, and export actions
