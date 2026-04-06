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
For OTP/password-reset emails, configure Gmail with Nodemailer using `EMAIL_SERVICE=gmail`, `EMAIL_USER=<your_gmail_address>`, `EMAIL_PASS=<your_16_character_app_password>`, and keep `EMAIL_FROM` the same as `EMAIL_USER`.
Use `EMAIL_HOST=smtp.gmail.com`, `EMAIL_PORT=465`, and `EMAIL_SECURE=true`.

Before testing signup, run:

```bash
npm run email:check
```

If that passes, Gmail SMTP is ready. Keep `backend/.env` aligned with `backend/.env.example` for the recommended Gmail settings.

You can also run:

```bash
npm start
```

`npm run dev` uses nodemon. `npm start` runs the server normally.
