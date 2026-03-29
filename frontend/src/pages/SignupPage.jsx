import { useState } from 'react'
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
  const [otpForm, setOtpForm] = useState({
    email: '',
    otp: '',
  })

  const emailFallbackHelp = {
    timeout: 'The backend reached SMTP, but the mail request timed out.',
    auth_failed: 'SMTP rejected the login. Recheck the mail username or app password.',
    config_missing: 'SMTP environment variables are missing on the backend.',
    connection_failed: 'The backend could not connect to the mail server.',
    delivery_failed: 'The mail provider rejected or failed the delivery request.',
  }

  const emailStatusTitle = signupResult?.emailSent
    ? 'Email delivery: Sent to inbox'
    : signupResult?.emailPreview
      ? 'Email delivery: Preview available'
      : signupResult?.developmentOtp
        ? 'Email delivery: Development OTP'
        : 'Email delivery: Unavailable'

  const emailStatusMessage = signupResult?.emailSent
    ? 'OTP has been sent to your mailbox.'
    : signupResult?.emailPreview
      ? 'SMTP is not delivering to inbox right now. Open the preview link below to get the OTP.'
      : signupResult?.developmentOtp
        ? 'SMTP is not delivering to inbox right now. Use the development OTP shown below.'
        : 'SMTP delivery failed, and no preview OTP is available from the backend right now.'

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
        emailPreview: data.emailPreview || '',
        emailSent: data.emailSent,
        emailFallbackCode: data.emailFallbackCode || '',
        emailFallbackReason: data.emailFallbackReason || '',
        developmentOtp: data.developmentOtp || '',
      })
      setOtpForm({
        email: form.email.trim(),
        otp: data.developmentOtp || '',
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create your account right now.')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(event) {
    const { name, value } = event.target
    setOtpForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleVerifyOtp(event) {
    event.preventDefault()

    if (!otpForm.email.trim() || !otpForm.otp.trim()) {
      toast.error('Email and OTP are required.')
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

    setResendingOtp(true)

    try {
      const data = await resendOtp(otpForm.email.trim())
      setSignupResult((current) => ({
        ...current,
        emailPreview: data.emailPreview || '',
        emailSent: data.emailSent,
        emailFallbackCode: data.emailFallbackCode || '',
        emailFallbackReason: data.emailFallbackReason || '',
        developmentOtp: data.developmentOtp || '',
      }))
      setOtpForm((current) => ({
        ...current,
        otp: data.developmentOtp || current.otp,
      }))
      toast.success(data.message || 'OTP sent again.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to resend the OTP.')
    } finally {
      setResendingOtp(false)
    }
  }

  return (
    <section className="soft-panel flex items-center p-6 md:p-8">
      <div className="w-full space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-ink-400">Create workspace</p>
          <h1 className="font-display text-3xl font-semibold text-ink-950 dark:text-white">Start your InterviewIQ account</h1>
          <p className="text-sm leading-6 text-ink-500 dark:text-ink-300">
            Create your account, then verify the OTP to activate login access.
          </p>
        </div>

        {!signupResult ? (
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <input
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
              <div className="space-y-2">
                <input
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
            <div className="space-y-2">
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
              {errors.email ? <p className="text-sm text-red-500">{errors.email}</p> : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center rounded-[28px] border border-ink-200 bg-white px-4 py-1 dark:border-white/10 dark:bg-ink-800">
                <input
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
                  className="text-ink-400 transition hover:text-ink-700 dark:text-ink-300 dark:hover:text-white"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-5 w-5" />
                </button>
              </div>
              {errors.password ? <p className="text-sm text-red-500">{errors.password}</p> : null}
            </div>

            <select
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

            <Button type="submit" variant="accent" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleVerifyOtp}>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Account created successfully.</p>
              <p className="mt-1">Verify your email now to finish signup.</p>
            </div>

            <div
              className={`rounded-3xl border p-4 text-sm ${
                signupResult.emailSent
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
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

            {signupResult.emailPreview ? (
              <a
                className="inline-flex text-sm font-medium text-coral-500 underline"
                href={signupResult.emailPreview}
                target="_blank"
                rel="noreferrer"
              >
                Open email preview
              </a>
            ) : null}

            {signupResult.developmentOtp && !signupResult.emailSent ? (
              <div className="rounded-3xl border border-coral-200 bg-coral-50 p-4 text-sm text-coral-700">
                <p className="font-semibold">Development OTP</p>
                <p className="mt-1">Use this code for local testing: <span className="font-bold">{signupResult.developmentOtp}</span></p>
              </div>
            ) : null}

            <div className="space-y-2">
              <input
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
            <div className="space-y-2">
              <input
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
              <Button type="button" variant="secondary" className="flex-1" disabled={resendingOtp} onClick={handleResendOtp}>
                {resendingOtp ? 'Sending...' : 'Resend OTP'}
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
          <Link to="/login" className="font-semibold text-ink-950 dark:text-white">
            Log in
          </Link>
        </p>
      </div>
    </section>
  )
}

export default SignupPage
