# Gmail OTP Setup

Use this setup for a stable OTP flow with Gmail and an app password.

## Required `.env` values

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-gmail-address@gmail.com
EMAIL_PASS=your16charapppassword
EMAIL_FROM=your-gmail-address@gmail.com
EMAIL_FROM_NAME=InterviewIQ
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_SECURE=true
OTP_EMAIL_TIMEOUT_MS=30000
OTP_RESEND_COOLDOWN_MS=60000
```

Notes:

- `EMAIL_PASS` must be the Gmail app password, not your normal Gmail password.
- Paste the app password without spaces. The backend also strips accidental spaces automatically now.
- Keep `EMAIL_FROM` the same as `EMAIL_USER`.
- Port `465` with `EMAIL_SECURE=true` is the recommended setup for this project.

## Gmail steps

1. Open your Google Account Security settings.
2. Turn on 2-Step Verification.
3. Go to App passwords.
4. Create a new app password for Mail.
5. Copy the generated 16-character password into `EMAIL_PASS`.
6. Restart the backend.

## Verify before testing signup

Run:

```bash
cd backend
npm run email:check
```

If the check passes, signup OTP and forgot-password OTP are ready to send.

## Local development

For local frontend development, use:

```env
VITE_DEV_API_BASE_URL=http://localhost:4000/api
```

That avoids accidentally sending signup/login requests to an old deployed backend with different environment variables.
