import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Button } from '../components/UI'
import { Icon } from '../components/Icons'
import { resendOtp, signupUser, verifyEmailOtp } from '../services/authService'
import { JOB_ROLES } from '../data/jobRoles'

function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    targetRole: 'Frontend Developer',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendingOtp, setResendingOtp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [signupResult, setSignupResult] = useState(null)
  const [resendAvailableAt, setResendAvailableAt] = useState(0)
  const [cooldownNow, setCooldownNow] = useState(() => Date.now())
  const [otpForm, setOtpForm] = useState({
    email: '',
    otp: '',
  })

  const emailFallbackHelp = {
    timeout: 'The backend reached the email provider, but the request timed out.',
    auth_failed: 'Email login failed. Recheck EMAIL_USER and EMAIL_PASS.',
    config_missing: 'Email environment variables are missing on the backend.',
    connection_failed: 'The backend could not connect to the email provider.',
    delivery_failed: 'The mail provider rejected or failed the delivery request.',
  }

  const resendCooldownSeconds = Math.max(0, Math.ceil((resendAvailableAt - cooldownNow) / 1000))

  const emailStatusTitle = signupResult?.cooldownActive
    ? 'OTP request on hold'
    : signupResult?.emailSent
      ? 'Email delivery: Sent to inbox'
      : 'Email delivery: Failed'

  const emailStatusMessage = signupResult?.message || (signupResult?.emailSent
    ? 'OTP has been sent to your mailbox.'
    : 'Unable to deliver OTP email right now. Please try resending.')

  useEffect(() => {
    if (resendAvailableAt <= Date.now()) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setCooldownNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [resendAvailableAt])

  useEffect(() => {
    if (resendAvailableAt && resendCooldownSeconds <= 0) {
      setResendAvailableAt(0)
    }
  }, [resendAvailableAt, resendCooldownSeconds])

  function startResendCooldown(retryAfterMs) {
    const retryAfter = Number(retryAfterMs || 0)

    if (retryAfter <= 0) {
      setResendAvailableAt(0)
      setCooldownNow(Date.now())
      return
    }

    setResendAvailableAt(Date.now() + retryAfter)
    setCooldownNow(Date.now())
  }

  function validateForm() {
    const nextErrors = {}

    if (!form.firstName.trim()) {
      nextErrors.firstName = 'First name is required.'
    }

    if (!form.lastName.trim()) {
      nextErrors.lastName = 'Last name is required.'
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.'
    } else if (form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.'
    }

    if (!form.targetRole.trim()) {
      nextErrors.targetRole = 'Target role is required.'
    }

    return nextErrors
  }

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setErrors((current) => ({
      ...current,
      [name]: '',
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateForm()
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please fix the signup form errors.')
      return
    }

    setLoading(true)

    try {
      const data = await signupUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        targetRole: form.targetRole,
      })

      toast.success(data.message || 'Account created. Verify your email to continue.')
      setSignupResult({
        emailSent: data.emailSent,
        emailFallbackCode: data.emailFallbackCode || '',
        emailFallbackReason: data.emailFallbackReason || '',
        cooldownActive: false,
        message: data.message || '',
      })
      setOtpForm({
        email: form.email.trim(),
        otp: '',
      })
      startResendCooldown(data.retryAfter)
    } catch (error) {
      const responseData = error.response?.data

      if (responseData?.otpFlowAvailable) {
        setSignupResult({
          emailSent: Boolean(responseData.emailSent),
          emailFallbackCode: responseData.emailFallbackCode || '',
          emailFallbackReason: responseData.emailFallbackReason || '',
          cooldownActive: Boolean(responseData.cooldownActive),
          message: responseData.message || '',
        })
        setOtpForm({
          email: form.email.trim(),
          otp: '',
        })
      }

      startResendCooldown(responseData?.retryAfter)
      toast.error(responseData?.message || 'Unable to create your account right now.')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(event) {
    const { name, value } = event.target
    const nextValue = name === 'otp' ? value.replace(/\D/g, '').slice(0, 6) : value
    setOtpForm((current) => ({
      ...current,
      [name]: nextValue,
    }))
  }

  async function handleVerifyOtp(event) {
    event.preventDefault()

    if (!otpForm.email.trim() || !otpForm.otp.trim()) {
      toast.error('Email and OTP are required.')
      return
    }

    if (!/^\d{6}$/.test(otpForm.otp.trim())) {
      toast.error('OTP must be a 6-digit code.')
      return
    }

    setOtpLoading(true)

    try {
      const data = await verifyEmailOtp({
        email: otpForm.email.trim(),
        otp: otpForm.otp.trim(),
      })

      toast.success(data.message || 'Email verified successfully.')
      navigate('/login', {
        state: {
          email: otpForm.email.trim(),
        },
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to verify the OTP.')
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleResendOtp() {
    if (!otpForm.email.trim()) {
      toast.error('Email is required to resend OTP.')
      return
    }

    if (resendingOtp || resendCooldownSeconds > 0) {
      return
    }

    setResendingOtp(true)

    try {
      const data = await resendOtp(otpForm.email.trim())
      setSignupResult((current) => ({
        ...current,
        emailSent: Boolean(data.emailSent),
        emailFallbackCode: data.emailFallbackCode || '',
        emailFallbackReason: data.emailFallbackReason || '',
        cooldownActive: false,
        message: data.message || '',
      }))
      startResendCooldown(data.retryAfter)
      toast.success(data.message || 'OTP sent again.')
    } catch (error) {
      const responseData = error.response?.data

      setSignupResult((current) => ({
        ...current,
        emailSent: responseData?.emailSent ?? current?.emailSent ?? false,
        emailFallbackCode: responseData?.emailFallbackCode || current?.emailFallbackCode || '',
        emailFallbackReason: responseData?.emailFallbackReason || current?.emailFallbackReason || '',
        cooldownActive: Boolean(responseData?.cooldownActive),
        message: responseData?.message || current?.message || '',
      }))
      startResendCooldown(responseData?.retryAfter)
      toast.error(responseData?.message || 'Unable to resend the OTP.')
    } finally {
      setResendingOtp(false)
    }
  }

  return (
    <section className="form-shell flex items-center">
      <div className="form-content w-full space-y-6">
        <div className="form-heading">
          <p className="form-kicker">Create workspace</p>
          <h1 className="form-title">Start your InterviewIQ account</h1>
          <p className="form-copy">
            Create your account, then verify the OTP to activate login access.
          </p>
        </div>

        {!signupResult ? (
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-group">
                <label className="form-label" htmlFor="signup-first-name">First name</label>
                <input
                  id="signup-first-name"
                  className="input-field"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  autoComplete="given-name"
                  required
                />
                {errors.firstName ? <p className="text-sm text-red-500">{errors.firstName}</p> : null}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="signup-last-name">Last name</label>
                <input
                  id="signup-last-name"
                  className="input-field"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  autoComplete="family-name"
                  required
                />
                {errors.lastName ? <p className="text-sm text-red-500">{errors.lastName}</p> : null}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                className="input-field"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email address"
                autoComplete="email"
                required
              />
              {errors.email ? <p className="text-sm text-red-500">{errors.email}</p> : null}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="signup-password">Password</label>
              <div className="input-shell">
                <input
                  id="signup-password"
                  className="w-full bg-transparent py-4 text-ink-950 outline-none dark:text-white"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create password"
                  autoComplete="new-password"
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
              {errors.password ? <p className="text-sm text-red-500">{errors.password}</p> : null}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-role">Target role</label>
              <select
                id="signup-role"
                className={`input-field ${errors.targetRole ? 'border-red-500' : ''}`}
                name="targetRole"
                value={form.targetRole}
                onChange={handleChange}
              >
                {JOB_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {errors.targetRole ? <p className="text-sm text-red-500">{errors.targetRole}</p> : null}
            </div>

            <Button type="submit" variant="accent" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleVerifyOtp}>
            <div className="status-banner status-banner-success">
              <p className="font-semibold">Account created successfully.</p>
              <p className="mt-1">Verify your email now to finish signup.</p>
            </div>

            <div
              className={`status-banner ${
                signupResult.emailSent
                  ? 'status-banner-success'
                  : 'status-banner-warning'
              }`}
            >
              <p className="font-semibold">{emailStatusTitle}</p>
              <p className="mt-1">{emailStatusMessage}</p>
              {!signupResult.emailSent && signupResult.emailFallbackCode ? (
                <p className="mt-2 text-xs">
                  Delivery code: {signupResult.emailFallbackCode}
                  {emailFallbackHelp[signupResult.emailFallbackCode] ? ` - ${emailFallbackHelp[signupResult.emailFallbackCode]}` : ''}
                </p>
              ) : null}
              {!signupResult.emailSent && signupResult.emailFallbackReason ? (
                <p className="mt-2 text-xs">
                  Debug reason: {signupResult.emailFallbackReason}
                </p>
              ) : null}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-otp-email">Email</label>
              <input
                id="signup-otp-email"
                className="input-field"
                type="email"
                name="email"
                value={otpForm.email}
                onChange={handleOtpChange}
                placeholder="Email address"
                autoComplete="email"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="signup-otp-code">OTP code</label>
              <input
                id="signup-otp-code"
                className="input-field"
                type="text"
                name="otp"
                value={otpForm.otp}
                onChange={handleOtpChange}
                placeholder="Enter OTP"
                autoComplete="one-time-code"
                inputMode="numeric"
                required
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="accent" className="flex-1" disabled={otpLoading}>
                {otpLoading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              <Button type="button" variant="secondary" className="flex-1" disabled={resendingOtp || resendCooldownSeconds > 0} onClick={handleResendOtp}>
                {resendingOtp ? 'Sending...' : resendCooldownSeconds > 0 ? `Resend OTP in ${resendCooldownSeconds}s` : 'Resend OTP'}
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setSignupResult(null)
                setOtpForm({ email: '', otp: '' })
              }}
            >
              Change signup details
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-ink-500 dark:text-ink-300">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-ink-950 transition hover:text-coral-500 dark:text-white dark:hover:text-sky-300">
            Log in
          </Link>
        </p>
      </div>
    </section>
  )
}

export default SignupPage
