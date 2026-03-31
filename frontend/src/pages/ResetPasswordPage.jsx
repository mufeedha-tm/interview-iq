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

  const [emailSent, setEmailSent] = useState(Boolean(location.state?.emailSent))
  const [emailFallbackCode, setEmailFallbackCode] = useState(location.state?.emailFallbackCode || '')
  const [emailFallbackReason, setEmailFallbackReason] = useState(location.state?.emailFallbackReason || '')
  const [form, setForm] = useState({
    email: initialEmail,
    otp: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const emailFallbackHelp = {
    timeout: 'The backend reached the email provider, but the request timed out.',
    auth_failed: 'Email login failed. Recheck EMAIL_USER and EMAIL_PASS.',
    config_missing: 'Email environment variables are missing on the backend.',
    connection_failed: 'The backend could not connect to the email provider.',
    delivery_failed: 'The mail provider rejected or failed the delivery request.',
  }

  const emailStatusTitle = emailSent
    ? 'Email delivery: Sent to inbox'
    : 'Email delivery: Failed'

  const emailStatusMessage = emailSent
    ? 'OTP mail is sent to your inbox.'
    : 'Unable to deliver OTP email right now. Please try resending.'

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
      toast.success(data.message || 'Password reset OTP sent again.')
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
