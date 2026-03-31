import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Button } from '../components/UI'
import { resendOtp, verifyEmailOtp } from '../services/authService'

function VerifyEmailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: location.state?.email || '',
    otp: '',
  })
  const [emailSent, setEmailSent] = useState(Boolean(location.state?.emailSent))
  const [emailFallbackCode, setEmailFallbackCode] = useState(location.state?.emailFallbackCode || '')
  const [emailFallbackReason, setEmailFallbackReason] = useState(location.state?.emailFallbackReason || '')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const emailFallbackHelp = {
    timeout: 'The backend reached the email provider, but the request timed out.',
    auth_failed: 'Email login failed. Recheck EMAIL_USER and EMAIL_PASS.',
    config_missing: 'Email environment variables are missing on the backend.',
    connection_failed: 'The backend could not connect to the email provider.',
    delivery_failed: 'The mail provider rejected or failed the delivery request.',
  }

  function handleChange(event) {
    const { name, value } = event.target
    const nextValue = name === 'otp' ? value.replace(/\D/g, '').slice(0, 6) : value
    setForm((current) => ({
      ...current,
      [name]: nextValue,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.email.trim() || !form.otp.trim()) {
      toast.error('Email and OTP are required.')
      return
    }

    if (!/^\d{6}$/.test(form.otp.trim())) {
      toast.error('OTP must be a 6-digit code.')
      return
    }

    setLoading(true)

    try {
      const data = await verifyEmailOtp({
        email: form.email.trim(),
        otp: form.otp.trim(),
      })

      toast.success(data.message || 'Email verified successfully.')
      navigate('/login', {
        state: {
          email: form.email.trim(),
        },
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to verify the OTP.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!form.email.trim()) {
      toast.error('Enter your email first.')
      return
    }

    setResending(true)

    try {
      const data = await resendOtp(form.email.trim())
      setEmailSent(Boolean(data.emailSent))
      setEmailFallbackCode(data.emailFallbackCode || '')
      setEmailFallbackReason(data.emailFallbackReason || '')
      toast.success(data.message || 'A new OTP has been sent.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to resend the OTP.')
    } finally {
      setResending(false)
    }
  }

  return (
    <section className="soft-panel flex items-center p-6 md:p-8">
      <form className="w-full space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-ink-400">Verify your account</p>
          <h1 className="font-display text-3xl font-semibold text-ink-950 dark:text-white">Enter the email OTP</h1>
          <p className="text-sm leading-6 text-ink-500 dark:text-ink-300">
            Signup now sends a real request to <code>/api/auth/signup</code>, and this step verifies
            <code> /api/auth/verify-email</code>.
          </p>
          <div
            className={`rounded-3xl border p-4 text-sm ${
              emailSent ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            <p className="font-semibold">{emailSent ? 'Email delivery: Sent to inbox' : 'Email delivery: Failed'}</p>
            <p className="mt-1">
              {emailSent ? 'OTP mail is sent to your inbox.' : 'Unable to deliver OTP email right now. Please try resending.'}
            </p>
            {!emailSent && emailFallbackCode ? (
              <p className="mt-2 text-xs">
                Delivery code: {emailFallbackCode}
                {emailFallbackHelp[emailFallbackCode] ? ` - ${emailFallbackHelp[emailFallbackCode]}` : ''}
              </p>
            ) : null}
            {!emailSent && emailFallbackReason ? <p className="mt-2 text-xs">Debug reason: {emailFallbackReason}</p> : null}
          </div>
        </div>

        <div className="space-y-4">
          <input
            className="input-field"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email address"
            autoComplete="email"
            required
          />
          <input
            className="input-field"
            type="text"
            name="otp"
            value={form.otp}
            onChange={handleChange}
            placeholder="6-digit OTP"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="accent" className="flex-1" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify email'}
          </Button>
          <Button type="button" variant="secondary" className="flex-1" onClick={handleResend} disabled={resending}>
            {resending ? 'Sending...' : 'Resend OTP'}
          </Button>
        </div>

        <p className="text-center text-sm text-ink-500 dark:text-ink-300">
          Already verified?{' '}
          <Link to="/login" className="font-semibold text-ink-950 dark:text-white">
            Log in
          </Link>
        </p>
      </form>
    </section>
  )
}

export default VerifyEmailPage
