import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Button } from '../components/UI'
import { Icon } from '../components/Icons'
import { useAuth } from '../context/useAuth'
import { loginUser } from '../services/authService'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    email: location.state?.email || '',
    password: '',
  })
  const { loginContext } = useAuth()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({ email: '', password: '' })

  function validate() {
    const nextErrors = { email: '', password: '' }
    const emailTrimmed = form.email.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailTrimmed) {
      nextErrors.email = 'Email is required.'
    } else if (!emailRegex.test(emailTrimmed)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!form.password) {
      nextErrors.password = 'Password is required.'
    }

    setErrors(nextErrors)
    return !nextErrors.email && !nextErrors.password
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!validate()) return

    setLoading(true)

    try {
      const data = await loginUser(form)
      loginContext(data)
      toast.success('Login successful')
      navigate('/dashboard')
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to log in right now.'
      if (message.toLowerCase().includes('email not verified')) {
        toast.info('Email verification is required before login.')
        navigate('/verify-email', {
          state: {
            email: form.email.trim(),
          },
        })
      } else {
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
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

  return (
    <section className="form-shell flex items-center">
      <form className="form-content w-full space-y-6" onSubmit={handleSubmit}>
        <div className="form-heading">
          <p className="form-kicker">Sign in</p>
          <h1 className="form-title">Continue your interview preparation</h1>
          <p className="form-copy">
            Log in to view saved sessions, continue interviews, update your profile, and download reports.
          </p>
        </div>

        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className={`input-field ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''}`}
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email address"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email ? <p className="text-xs text-red-500">{errors.email}</p> : null}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div className="input-shell">
              <div className="w-full">
                <input
                  id="login-password"
                  className={`w-full bg-transparent py-4 text-ink-950 outline-none dark:text-white ${errors.password ? 'border-b border-red-500' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                />
                {errors.password ? <p className="mt-1 text-xs text-red-500">{errors.password}</p> : null}
              </div>
              <button
                type="button"
                className="input-icon-button shrink-0"
                onClick={() => setShowPassword((current) => !current)}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm font-semibold text-ink-950 transition hover:text-coral-500 dark:text-white dark:hover:text-sky-300">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </Button>

        <p className="text-center text-sm text-ink-500 dark:text-ink-300">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-ink-950 transition hover:text-coral-500 dark:text-white dark:hover:text-sky-300">
            Create an account
          </Link>
        </p>
      </form>
    </section>
  )
}

export default LoginPage
