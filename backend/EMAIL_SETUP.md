# Email Configuration Guide

This guide helps you set up email delivery for InterviewIQ. The common error "Connection timeout" usually means the email credentials are incorrect or not configured properly.

## 🚀 Quick Setup (Gmail - Recommended)

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Find "2-Step Verification" and click it
3. Follow the steps to enable 2FA

### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select Device: "Windows Computer" or "Mac"
3. Select App: "Mail"
4. Google will generate a 16-character password (e.g., `abcd efgh ijkl mnop`)
5. Copy this password (without spaces)

### Step 3: Configure Environment Variables
In `backend/.env`:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=abcdefghijklmnop
EMAIL_FROM_NAME=InterviewIQ
```

**Important**: 
- `EMAIL_USER` must be your Gmail address (e.g., `user@gmail.com`)
- `EMAIL_PASS` must be the 16-character app password (no spaces)
- Common mistake: Using regular Gmail password instead of app password

### Step 4: Test Email Delivery

Start your server:
```bash
npm run dev
```

The logs should show:
```
✅ Server listening on http://localhost:4000
✅ Database connected successfully
```

When you sign up, you should see:
```
✅ Email delivery successful
```

---

## 🔧 Troubleshooting

### Error: "Connection timeout"

**Solution 1**: Check if app password is used (not regular password)
```bash
# ❌ Wrong - this is your Gmail password
EMAIL_PASS=YourNormalGmailPassword

# ✅ Correct - this is the 16-char app password
EMAIL_PASS=abcdefghijklmnop
```

**Solution 2**: Ensure 2FA is enabled
- You MUST enable 2-Step Verification first
- App passwords only work with 2FA enabled

**Solution 3**: Check Gmail security settings
1. Go to [Less secure app access](https://myaccount.google.com/lesssecureapps)
2. This setting is deprecated, but you need to:
   - Enable 2FA first
   - Use "App Passwords" instead of this

### Error: "Invalid login credentials"

- Double-check `EMAIL_USER` matches your Gmail address
- Verify `EMAIL_PASS` is the app password (16 characters)
- Make sure there are no extra spaces or line breaks

### Logs show "auth_failed" error

Try this fix in `backend/src/utils/email.js` - the code already retries 3 times with exponential backoff.

Check your terminal logs for the actual error message:
```
Email send failed via gmail-service: [ACTUAL ERROR MESSAGE]
```

---

## 📧 Alternative Email Services

If Gmail doesn't work, you can use other services:

### Option 1: SendGrid (Free tier: 100 emails/day)

1. Go to [SendGrid](https://sendgrid.com)
2. Sign up and verify your account
3. Create an API key in Settings
4. Configure in `backend/.env`:

```env
EMAIL_SERVICE=sendgrid
EMAIL_USER=apikey
EMAIL_PASS=SG.xxxxxxxxxxxxx_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

### Option 2: Brevo (formerly Sendinblue - Free tier: 300 emails/day)

1. Go to [Brevo](https://www.brevo.com)
2. Sign up for free
3. Get SMTP credentials from Settings > SMTP & API
4. Configure in `backend/.env`:

```env
EMAIL_SERVICE=brevo
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=your-brevo-email@example.com
EMAIL_PASS=your-brevo-password
EMAIL_FROM=noreply@yourdomain.com
```

### Option 3: Custom SMTP Server

```env
EMAIL_SERVICE=custom
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-password
EMAIL_FROM=noreply@example.com
```

---

## ✅ Verification Checklist

Before testing signup with friends:

- [ ] 2FA is enabled on Gmail account
- [ ] App password generated and copied (16 characters)
- [ ] `EMAIL_USER` is your Gmail address
- [ ] `EMAIL_PASS` is the app password (not regular password)
- [ ] Backend `.env` file is properly configured
- [ ] Backend server restarted after changing `.env`
- [ ] No typos in email configuration
- [ ] Test email sends without "Connection timeout"

---

## 🧪 Manual Email Test

Add this temporary route to test email delivery:

```javascript
// backend/src/routes/testRoutes.js
const express = require('express');
const { sendEmail } = require('../utils/email');
const router = express.Router();

router.post('/test-email', async (req, res) => {
  try {
    const result = await sendEmail({
      to: req.body.email,
      subject: 'Test Email from InterviewIQ',
      html: '<p>If you see this, email delivery works!</p>',
      text: 'If you see this, email delivery works!',
    });
    res.json({ success: true, messageId: result.messageId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

Add to `backend/src/routes/index.js`:
```javascript
router.use('/test', testRoutes);
```

Then test with curl:
```bash
curl -X POST http://localhost:4000/api/test/test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com"}'
```

---

## 📋 Email Configuration Variables Reference

| Variable | Example | Description |
|----------|---------|-------------|
| `EMAIL_SERVICE` | `gmail` | Email service type (gmail, sendgrid, brevo, custom) |
| `EMAIL_USER` | `your-email@gmail.com` | Account email for authentication |
| `EMAIL_PASS` | `abcdefghijklmnop` | App password or API key |
| `EMAIL_HOST` | `smtp.gmail.com` | SMTP server address (for custom services) |
| `EMAIL_PORT` | `587` | SMTP port (25, 587, 465) |
| `EMAIL_SECURE` | `true` | Use TLS/SSL for connection |
| `EMAIL_FROM_NAME` | `InterviewIQ` | Display name in "From" field |
| `LOG_LEVEL` | `debug` | Set to `debug` to see detailed email logs |

---

## 🛠️ Debugging with Logs

Enable detailed logging to see exactly what's happening:

In `backend/.env`:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

Then check `backend/logs/all.log` for detailed information:
```bash
tail -f backend/logs/all.log | grep -i email
```

Look for messages like:
```
✅ Email send attempt 1 succeeded
❌ Email send attempt 1 failed: Connection refused, retrying in 2000ms
✅ Email send succeeded via gmail-service
```

---

## 🆘 Still Having Issues?

1. **Check error message carefully** - the actual error from Google/provider is in the logs
2. **Try a different email service** - SendGrid or Brevo are easier to set up
3. **Verify network connectivity** - try pinging the SMTP server:
   ```bash
   ping smtp.gmail.com
   ```
4. **Check firewall/antivirus** - some block SMTP connections
5. **Test credentials** - are they really correct? Copy-paste from the source, don't retype

Still stuck? Enable debug logging and share the exact error message from logs.
