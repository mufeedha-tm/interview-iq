import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Button } from '../components/UI'
import { Icon } from '../components/Icons'
import { forgotPassword } from '../services/authService'

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendAvailableAt, setSendAvailableAt] = useState(0)
  const [cooldownNow, setCooldownNow] = useState(() => Date.now())

  const sendCooldownSeconds = Math.max(0, Math.ceil((sendAvailableAt - cooldownNow) / 1000))

  useEffect(() => {
    if (sendAvailableAt <= Date.now()) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setCooldownNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timer)
  }, [sendAvailableAt])

  useEffect(() => {
    if (sendAvailableAt && sendCooldownSeconds <= 0) {
      setSendAvailableAt(0)
    }
  }, [sendAvailableAt, sendCooldownSeconds])

  function startCooldown(retryAfterMs) {
    const retryAfter = Number(retryAfterMs || 0)

    if (retryAfter <= 0) {
      setSendAvailableAt(0)
      setCooldownNow(Date.now())
      return
    }

    setSendAvailableAt(Date.now() + retryAfter)
    setCooldownNow(Date.now())
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!email.trim()) {
      toast.error('Email is required.')
      return
    }

    if (loading || sendCooldownSeconds > 0) {
      return
    }

    setLoading(true)

    try {
      const data = await forgotPassword(email.trim())
      startCooldown(data.retryAfter)
      toast.success(data.message || 'Password reset OTP sent to your email')
      navigate('/reset-password', {
        state: {
          email: email.trim(),
          emailSent: data.emailSent,
          emailFallbackCode: data.emailFallbackCode || '',
          emailFallbackReason: data.emailFallbackReason || '',
        },
      })
    } catch (error) {
      const responseData = error.response?.data
      startCooldown(responseData?.retryAfter)
      toast.error(responseData?.message || 'Unable to process your request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="form-shell flex items-center">
      <form className="form-content w-full space-y-6" onSubmit={handleSubmit}>
        <div className="form-heading">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 transition hover:text-ink-900 dark:text-ink-300 dark:hover:text-white">
            <Icon name="arrowLeft" className="h-4 w-4" />
            Back to login
          </Link>
          <h1 className="form-title">Reset your password</h1>
          <p className="form-copy">
            Enter your email address and we'll send you an OTP to reset your password.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            className="input-field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            autoComplete="email"
            required
          />
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={loading || sendCooldownSeconds > 0}>
          {loading ? 'Sending OTP...' : sendCooldownSeconds > 0 ? `Send OTP in ${sendCooldownSeconds}s` : 'Send OTP'}
        </Button>
      </form>
    </section>
  )
}

export default ForgotPasswordPage
