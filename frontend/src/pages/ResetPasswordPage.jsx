import { useState } from 'react'
import { useLocation, useNavigate, Navigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Button } from '../components/UI'
import { Icon } from '../components/Icons'
import { resendPasswordOtp, resetPassword } from '../services/authService'

function ResetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const emailFromState = location.state?.email || ''
  const emailFromQuery = searchParams.get('email') || ''
  const initialEmail = (emailFromState || emailFromQuery).trim()

  const [emailPreview, setEmailPreview] = useState(location.state?.emailPreview || '')
  const [emailSent, setEmailSent] = useState(Boolean(location.state?.emailSent))
  const [emailFallbackCode, setEmailFallbackCode] = useState(location.state?.emailFallbackCode || '')
  const [emailFallbackReason, setEmailFallbackReason] = useState(location.state?.emailFallbackReason || '')
  const [developmentOtp, setDevelopmentOtp] = useState(location.state?.developmentOtp || '')
  const [form, setForm] = useState({
    email: initialEmail,
    otp: location.state?.developmentOtp || '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const emailFallbackHelp = {
    timeout: 'The backend reached SMTP, but the mail request timed out.',
    auth_failed: 'SMTP rejected the login. Recheck the mail username or app password.',
    config_missing: 'SMTP environment variables are missing on the backend.',
    connection_failed: 'The backend could not connect to the mail server.',
    delivery_failed: 'The mail provider rejected or failed the delivery request.',
  }

  const emailStatusTitle = emailSent
    ? 'Email delivery: Sent to inbox'
    : emailPreview
      ? 'Email delivery: Preview available'
      : developmentOtp
        ? 'Email delivery: Development OTP'
        : 'Email delivery: Unavailable'

  const emailStatusMessage = emailSent
    ? 'OTP mail is sent to your inbox.'
    : emailPreview
      ? 'SMTP is not delivering to inbox right now. Open the preview link below to get the OTP.'
      : developmentOtp
        ? 'SMTP is not delivering to inbox right now. Use the development OTP shown below.'
        : 'SMTP delivery failed, and no preview OTP is available from the backend right now.'

  if (!initialEmail) {
    return <Navigate to="/forgot-password" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const payload = {
      email: form.email.trim(),
      otp: form.otp.trim(),
      password: form.password,
    }

    if (!payload.email || !payload.otp || !payload.password) {
      toast.error('Email, OTP, and new password are required.')
      return
    }

    if (!/^\d{6}$/.test(payload.otp)) {
      toast.error('OTP must be a 6-digit code.')
      return
    }

    if (payload.password.length < 6) {
      toast.error('New password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      await resetPassword(payload)
      toast.success('Password reset successful. Please log in.')
      navigate('/login', { state: { email: payload.email } })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired OTP.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOtp() {
    if (!form.email.trim()) {
      toast.error('Email is required to resend OTP.')
      return
    }

    setResending(true)
    try {
      const data = await resendPasswordOtp(form.email.trim())
      setEmailSent(Boolean(data.emailSent))
      setEmailFallbackCode(data.emailFallbackCode || '')
      setEmailFallbackReason(data.emailFallbackReason || '')
      setEmailPreview(data.emailPreview || '')
      setDevelopmentOtp(data.developmentOtp || '')
      setForm((current) => ({
        ...current,
        otp: data.developmentOtp || current.otp,
      }))
      if (!data.emailSent && !data.emailPreview && !data.developmentOtp) {
        toast.info('If the account exists, OTP was generated. Check email delivery config.')
      } else {
        toast.success(data.message || 'Password reset OTP sent again.')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to resend password OTP.')
    } finally {
      setResending(false)
    }
  }

  function handleChange(event) {
    const { name, value } = event.target
    const nextValue = name === 'otp' ? value.replace(/\D/g, '').slice(0, 6) : value
    setForm((current) => ({
      ...current,
      [name]: nextValue,
    }))
  }

  return (
    <section className="soft-panel flex items-center p-6 md:p-8">
      <form className="w-full space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <p className="text-sm tracking-widest text-ink-500">{form.email}</p>
          <h1 className="font-display text-3xl font-semibold text-ink-950 dark:text-white">Verify OTP & Reset</h1>
          <p className="text-sm leading-6 text-ink-500 dark:text-ink-300">
            Enter the 6-digit code sent to your email to set a new password.
          </p>
        </div>

        <div
          className={`rounded-3xl border p-4 text-sm ${
            emailSent ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <p className="font-semibold">{emailStatusTitle}</p>
          <p className="mt-1">{emailStatusMessage}</p>
          {!emailSent && emailFallbackCode ? (
            <p className="mt-2 text-xs">
              Delivery code: {emailFallbackCode}
              {emailFallbackHelp[emailFallbackCode] ? ` - ${emailFallbackHelp[emailFallbackCode]}` : ''}
            </p>
          ) : null}
          {!emailSent && emailFallbackReason ? <p className="mt-2 text-xs">Debug reason: {emailFallbackReason}</p> : null}
        </div>

        {emailPreview ? (
          <a
            className="inline-flex text-sm font-medium text-coral-500 underline"
            href={emailPreview}
            target="_blank"
            rel="noreferrer"
          >
            Open email preview
          </a>
        ) : null}

        {developmentOtp && !emailSent ? (
          <div className="rounded-3xl border border-coral-200 bg-coral-50 p-4 text-sm text-coral-700">
            <p className="font-semibold">Development OTP</p>
            <p className="mt-1">
              Use this code for local testing: <span className="font-bold">{developmentOtp}</span>
            </p>
          </div>
        ) : null}

        <div className="space-y-4">
          <input
            className="input-field max-w-[200px] text-center tracking-widest border-2 focus:border-indigo-500"
            type="text"
            name="otp"
            value={form.otp}
            onChange={handleChange}
            placeholder="000000"
            maxLength={6}
            required
            autoComplete="off"
          />

          <div className="flex items-center rounded-[28px] border border-ink-200 bg-white px-4 py-1 dark:border-white/10 dark:bg-ink-800">
            <input
              className="w-full bg-transparent py-4 text-ink-950 outline-none dark:text-white"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="New password"
              minLength={6}
              required
            />
            <button
              type="button"
              className="text-ink-400 transition hover:text-ink-700 dark:text-ink-300 dark:hover:text-white"
              onClick={() => setShowPassword((current) => !current)}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-5 w-5" />
            </button>
          </div>
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </Button>

        <Button type="button" variant="secondary" className="w-full" disabled={resending} onClick={handleResendOtp}>
          {resending ? 'Sending OTP...' : 'Resend OTP'}
        </Button>
      </form>
    </section>
  )
}

export default ResetPasswordPage
