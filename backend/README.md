# Backend

This is the Express and MongoDB backend for InterviewIQ.

## Features

- Authentication with JWT
- OTP email verification
- Interview CRUD
- Resume upload
- Profile update
- Analytics routes
- Premium payment routes

## Run

Add your values in `backend/.env`, then run:

```bash
npm install
npm run dev
```

If using MongoDB Atlas, make sure your current IP address is allowed in Atlas Network Access before starting the server.

For OTP/password-reset emails in production without buying a domain, configure Gmail API over HTTPS with:

```env
EMAIL_PROVIDER=gmail_api
GMAIL_CLIENT_ID=<your_google_oauth_client_id>
GMAIL_CLIENT_SECRET=<your_google_oauth_client_secret>
GMAIL_REFRESH_TOKEN=<your_google_oauth_refresh_token>
EMAIL_FROM=<your_gmail_address>
EMAIL_FROM_NAME=InterviewIQ
```

For local Gmail testing, you can still use Nodemailer SMTP with:

```env
EMAIL_PROVIDER=smtp
EMAIL_SERVICE=gmail
EMAIL_USER=<your_gmail_address>
EMAIL_PASS=<your_16_character_app_password>
EMAIL_FROM=<your_gmail_address>
```

Do not set `EMAIL_HOST`, `EMAIL_PORT`, or `EMAIL_SECURE` when using Gmail app-password mode.

Before testing signup, run:

```bash
npm run email:check
```

If that passes, your configured email provider is ready. Keep `backend/.env` aligned with `backend/.env.example`.

You can also run:

```bash
npm start
```

`npm run dev` uses nodemon. `npm start` runs the server normally.
