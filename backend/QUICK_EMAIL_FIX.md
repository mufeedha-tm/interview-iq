# ✅ Email Setup - Quick Checklist (5 minutes)

If you're getting "Connection timeout" or "502 failure" on signup, follow this checklist:

## 🔵 Step 1: Enable Gmail 2-Factor Authentication (2 minutes)

- [ ] Go to https://myaccount.google.com/security
- [ ] Find "2-Step Verification"  
- [ ] Click it and follow prompts
- [ ] Confirm 2FA is now enabled

## 🔵 Step 2: Generate Gmail App Password (1 minute)

- [ ] Go to https://myaccount.google.com/apppasswords
- [ ] Select Device: "Windows Computer" (or your OS)
- [ ] Select App: "Mail"
- [ ] Click "Generate"
- [ ] **Copy the 16-character password** (it appears at bottom)
- [ ] **Keep this password safe** - you'll use it in Step 3

## 🔵 Step 3: Update backend/.env (1 minute)

Open `backend/.env` and update:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
```

**Important:**
- Copy your Gmail address exactly (case doesn't matter)
- Paste the 16-char password WITHOUT spaces
- So if Google shows: `abcd efgh ijkl mnop`
- Type in .env: `abcdefghijklmnop`

## 🔵 Step 4: Restart Backend (1 minute)

```bash
# Stop current server (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

You should see in the terminal:
```
✅ Server listening on http://localhost:4000
✅ Database connected successfully
```

## 🔵 Step 5: Test Signup

1. Go to http://localhost:5173/signup
2. Create a test account
3. Check inbox - you should receive OTP email within 10 seconds

---

## ❌ Troubleshooting

### Still Getting "Connection timeout"?

**Issue 1: Using wrong password**
- ❌ Used your regular Gmail password
- ✅ Must use the 16-char app password from myaccount.google.com/apppasswords

**Issue 2: 2FA not enabled**
- ❌ Skipped 2-Step Verification setup
- ✅ App passwords only work if 2FA is enabled

**Issue 3: Typo in password**
- ❌ Added extra spaces or wrong characters
- ✅ Copy-paste the password, don't retype it

**Issue 4: Didn't restart backend**
- ❌ Updated .env but server still running with old config
- ✅ Stop server (Ctrl+C) and restart with `npm run dev`

### Still doesn't work?

Try these:

1. **Check your Gmail is correct:**
   ```bash
   echo Your Email: your-email@gmail.com
   ```

2. **Verify you can see the app password:**
   - Go back to https://myaccount.google.com/apppasswords
   - Make sure it still shows your generated password
   - If not, generate a new one

3. **Check server logs for actual error:**
   - Look at backend terminal output
   - Copy the exact error message
   - Search that message or ask for help with it

4. **Try alternative email service:**
   - See instructions in `backend/EMAIL_SETUP.md`
   - SendGrid or Brevo are easier alternatives

---

## 📋 Summary

| Step | Action | Verify |
|------|--------|--------|
| 1 | Enable 2FA on Gmail | "2-Step Verification" shows enabled |
| 2 | Generate app password | You see 16-char password at myaccount.google.com/apppasswords |
| 3 | Copy to .env | EMAIL_PASS has 16 chars (no spaces) |
| 4 | Restart backend | Terminal shows "Server listening on..." |
| 5 | Test signup | Receive OTP email within 10 seconds |

---

## 🎯 If Everything Works:

You should now be able to:
- ✅ Sign up with email verification
- ✅ Friends can sign up and receive OTP codes
- ✅ Password reset emails work
- ✅ Interview completion emails send

Great! Your email system is ready for production.

---

For detailed setup info, see `backend/EMAIL_SETUP.md`
