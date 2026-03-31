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
For OTP/password-reset emails, configure `EMAIL_SERVICE`, `EMAIL_USER`, and `EMAIL_PASS` and send with Nodemailer.
If using Gmail, keep `EMAIL_FROM` equal to `EMAIL_USER`.

You can also run:

```bash
npm start
```

`npm run dev` uses nodemon. `npm start` runs the server normally.
