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
    <section className="form-shell flex items-center">
      <form className="form-content w-full space-y-6" onSubmit={handleSubmit}>
        <div className="form-heading">
          <p className="form-kicker">{form.email}</p>
          <h1 className="form-title">Verify OTP & Reset</h1>
          <p className="form-copy">
            Enter the 6-digit code sent to your email to set a new password.
          </p>
        </div>

        <div
          className={`status-banner ${
            emailSent ? 'status-banner-success' : 'status-banner-warning'
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
          <div className="form-group">
            <label className="form-label" htmlFor="reset-otp">OTP code</label>
            <input
              id="reset-otp"
              className="input-field otp-field border-2"
              type="text"
              name="otp"
              value={form.otp}
              onChange={handleChange}
              placeholder="000000"
              maxLength={6}
              required
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reset-password">New password</label>
            <div className="input-shell">
              <input
                id="reset-password"
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
                className="input-icon-button shrink-0"
                onClick={() => setShowPassword((current) => !current)}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-5 w-5" />
              </button>
            </div>
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
