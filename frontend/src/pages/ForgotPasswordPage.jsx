import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Button } from '../components/UI'
import { Icon } from '../components/Icons'
import { forgotPassword } from '../services/authService'

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (!email.trim()) {
      toast.error('Email is required.')
      return
    }

    setLoading(true)

    try {
      const data = await forgotPassword(email.trim())
      toast.success(data.message || 'Password reset OTP sent to your email')
      navigate('/reset-password', {
        state: {
          email: email.trim(),
          emailSent: data.emailSent,
          emailFallbackReason: data.emailFallbackReason || '',
          developmentOtp: data.developmentOtp || '',
          emailPreview: data.emailPreview || '',
        },
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to process your request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="soft-panel flex items-center p-6 md:p-8">
      <form className="w-full space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Link to="/login" className="inline-flex items-center gap-2 mb-4 text-sm font-semibold text-ink-500 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white transition">
            <Icon name="arrowLeft" className="h-4 w-4" />
            Back to login
          </Link>
          <h1 className="font-display text-3xl font-semibold text-ink-950 dark:text-white">Reset your password</h1>
          <p className="text-sm leading-6 text-ink-500 dark:text-ink-300">
            Enter your email address and we'll send you an OTP to reset your password.
          </p>
        </div>

        <div className="space-y-4">
          <input
            className="input-field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            autoComplete="email"
            required
          />
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? 'Sending OTP...' : 'Send OTP'}
        </Button>
      </form>
    </section>
  )
}

export default ForgotPasswordPage
