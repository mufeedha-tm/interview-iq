import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import heroImage from '../assets/hero.png'
import { Button, Panel, SectionIntro } from '../components/UI'
import { Icon } from '../components/Icons'
import { Reveal, TiltCard } from '../components/PremiumEffects'
import { createInterview, fetchInterviewRoles, generateInterviewEngine } from '../services/interviewService'
import { confirmPremiumCheckout, fetchPaymentPlans, redirectToPremiumCheckout } from '../services/paymentService'
import { focusTracks, premiumPlans } from '../data/mockData'
import { getStoredUser, storeAuthSession } from '../lib/auth'
import { useAuth } from '../context/useAuth'

const launchSteps = [
  'We generate fresh questions based on your role, level, and skills.',
  'You answer in a guided session with text, audio, or video capture.',
  'The interview engine returns structured feedback and follow-up prompts.',
]

const defaultInterviewForm = {
  role: 'Frontend Engineering',
  experienceLevel: 'mid-level',
  interviewType: 'mixed',
  difficulty: 'medium',
  duration: '35',
  skills: '',
  jobDescription: '',
}

function parseSkillsInput(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toggleSkillValue(currentValue, skill) {
  const normalizedSkill = String(skill || '').trim()
  if (!normalizedSkill) return currentValue

  const currentSkills = parseSkillsInput(currentValue)
  const hasSkill = currentSkills.some((item) => item.toLowerCase() === normalizedSkill.toLowerCase())

  if (hasSkill) {
    return currentSkills.filter((item) => item.toLowerCase() !== normalizedSkill.toLowerCase()).join(', ')
  }

  return [...currentSkills, normalizedSkill].join(', ')
}

function StartInterviewPage() {
  const navigate = useNavigate()
  const { user: authUser, updateUserContext } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans] = useState(premiumPlans)
  const [roles, setRoles] = useState([])
  const [user, setUser] = useState(getStoredUser())
  const [creating, setCreating] = useState(false)
  const [paymentState, setPaymentState] = useState({ loading: false })
  const handledSessionRef = useRef('')
  const [form, setForm] = useState(defaultInterviewForm)
  const roleOptions = roles.length ? roles : focusTracks.map((item) => ({ label: item, defaultSkills: [] }))
  const activeRole = roleOptions.find((item) => item.label === form.role) || roleOptions[0] || null
  const suggestedSkills = activeRole?.defaultSkills || []

  useEffect(() => {
    if (authUser) {
      setUser(authUser)
    }
  }, [authUser])

  useEffect(() => {
    let active = true

    async function loadRoles() {
      try {
        const data = await fetchInterviewRoles()
        if (active && Array.isArray(data.roles)) {
          setRoles(data.roles)
          setForm((current) => {
            const hasCurrentRole = data.roles.some((item) => item.label === current.role)
            if (hasCurrentRole) return current
            return {
              ...current,
              role: data.roles[0]?.label || current.role,
            }
          })
        }
      } catch {
        setRoles([])
      }
    }

    async function loadPlans() {
      try {
        const data = await fetchPaymentPlans()

        if (active && data.plans?.length) {
          setPlans(
            data.plans.map((plan) => ({
              id: plan.id,
              name: plan.name,
              price: `$${plan.price}`,
              interviews: `${plan.premiumInterviews} premium interviews`,
              features: plan.features,
            })),
          )
        }
      } catch {
        setPlans(premiumPlans)
      }
    }

    loadPlans()
    loadRoles()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const checkout = searchParams.get('checkout')
    const sessionId = searchParams.get('session_id')

    if (checkout === 'cancelled') {
      toast.info('Premium checkout was cancelled.')
      setSearchParams({})
      return
    }

    if (checkout !== 'success' || !sessionId || handledSessionRef.current === sessionId) {
      return
    }

    handledSessionRef.current = sessionId

    async function confirmPayment() {
      try {
        const data = await confirmPremiumCheckout(sessionId)
        storeAuthSession({ user: data.user })
        updateUserContext(data.user)
        setUser(data.user)
        toast.success(`${data.message}. ${data.user.premiumInterviewsRemaining} premium credits available.`)
        setSearchParams({})
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to confirm the premium payment.')
      }
    }

    confirmPayment()
  }, [searchParams, setSearchParams, updateUserContext])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleLaunchSession() {
    const skills = form.skills
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    if (!form.role.trim()) {
      toast.error('Role is required.')
      return
    }

    if (!skills.length) {
      toast.error('Add at least one skill.')
      return
    }

    if (form.interviewType === 'premium_panel' && (!user || user.subscriptionTier !== 'premium')) {
      toast.error('Buy premium first to unlock premium panel interviews.')
      return
    }

    setCreating(true)

    try {
      const engine = await generateInterviewEngine({
        role: form.role,
        interviewType: form.interviewType === 'premium_panel' ? 'technical' : form.interviewType,
        difficulty: form.difficulty,
        experienceLevel: form.experienceLevel,
        skills,
        questionCount: Number(form.duration) >= 50 ? 6 : 4,
      })

      const questions = engine.questions?.map((item) => item.question).filter(Boolean) || []

      if (!questions.length) {
        throw new Error('No interview questions were generated.')
      }

      const { interview } = await createInterview({
        title: `${form.role} interview`,
        description: form.jobDescription || `${form.interviewType} interview practice session`,
        questions,
        difficulty: form.difficulty,
        skills,
        status: 'draft',
      })

      navigate(`/interview-session?interviewId=${interview._id}`)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Unable to create the interview session.')
    } finally {
      setCreating(false)
    }
  }

  async function handlePremiumCheckout(planId) {
    if (user?.subscriptionTier === 'premium') {
      toast.info('Your account is already on Premium.')
      return
    }

    setPaymentState({ loading: true })

    try {
      await redirectToPremiumCheckout(planId)
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Unable to start premium checkout.')
      setPaymentState({ loading: false })
    }
  }

  function handleResetForm() {
    setForm(defaultInterviewForm)
    toast.info('Interview setup reset to defaults.')
  }

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Start interview"
        title="Launch a high-quality interview round from a polished control room."
        copy="Set the role, level, duration, and focus skills. We use those inputs to generate a fresh interview and move you directly into the live session."
      />

      <Reveal>
        <div className="dashboard-band">
          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-center">
            <div className="space-y-6">
              <span className="pill">Session builder</span>
              <div className="space-y-3">
                <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-950 md:text-5xl dark:text-white">
                  Build a realistic round that matches the role you actually want.
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-ink-500 md:text-base dark:text-ink-300">
                  This flow avoids generic interview practice. Your role, topics, and target difficulty shape the questions, the recorded session, and the final report.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {launchSteps.map((item, index) => (
                  <TiltCard key={item} className="surface-tile p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-coral-500">Step 0{index + 1}</p>
                    <p className="mt-4 text-sm leading-6 text-ink-700 dark:text-ink-100">{item}</p>
                  </TiltCard>
                ))}
              </div>
            </div>

            <TiltCard className="dark-card p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/55">Session preview</p>
                  <p className="mt-2 font-display text-2xl font-semibold">Interview control room</p>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/72">
                  {form.duration} min
                </div>
              </div>
              <div className="mt-5 space-y-4">
                <img src={heroImage} alt="Interview session visual" className="mx-auto w-full max-w-[180px]" />
                <div className="rounded-2xl bg-white/7 px-4 py-3 text-sm text-white/82">Role: {form.role}</div>
                <div className="rounded-2xl bg-white/7 px-4 py-3 text-sm text-white/82">Mode: {form.interviewType}</div>
                <div className="rounded-2xl bg-white/7 px-4 py-3 text-sm text-white/82">Difficulty: {form.difficulty}</div>
              </div>
            </TiltCard>
          </div>
        </div>
      </Reveal>

      <div className="page-grid">
        <Reveal delay={80}>
          <Panel title="Interview setup" copy="These inputs are used to create the next round.">
            <div className="grid gap-4 md:grid-cols-2">
              <select className="input-field" name="role" value={form.role} onChange={handleChange}>
                {roleOptions.map((item) => (
                  <option key={item.label} value={item.label}>
                    {item.label}
                  </option>
                ))}
              </select>
              <select className="input-field" name="experienceLevel" value={form.experienceLevel} onChange={handleChange}>
                <option value="entry-level">Entry level</option>
                <option value="mid-level">Mid-level</option>
                <option value="senior">Senior</option>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
              <select className="input-field" name="interviewType" value={form.interviewType} onChange={handleChange}>
                <option value="behavioral">Behavioral</option>
                <option value="technical">Technical</option>
                <option value="mixed">Mixed</option>
                <option value="premium_panel">Premium panel</option>
              </select>
              <select className="input-field" name="difficulty" value={form.difficulty} onChange={handleChange}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <select className="input-field" name="duration" value={form.duration} onChange={handleChange}>
                <option value="20">20 minutes</option>
                <option value="35">35 minutes</option>
                <option value="50">50 minutes</option>
                <option value="60">60 minutes</option>
              </select>
              <div className="space-y-3 md:col-span-2">
                <input
                  className="input-field"
                  name="skills"
                  value={form.skills}
                  onChange={handleChange}
                  placeholder="Select below or type custom skills (comma separated)"
                />
                {suggestedSkills.length ? (
                  <div className="toolbar-shell flex flex-wrap gap-2">
                    {suggestedSkills.map((skill) => {
                      const selected = parseSkillsInput(form.skills).some(
                        (item) => item.toLowerCase() === String(skill).toLowerCase(),
                      )

                      return (
                        <button
                          key={skill}
                          type="button"
                          className={`status-chip transition ${
                            selected
                              ? 'status-chip-danger'
                              : 'status-chip-neutral'
                          }`}
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              skills: toggleSkillValue(current.skills, skill),
                            }))
                          }
                        >
                          {selected ? `Selected: ${skill}` : skill}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <textarea
              className="input-field mt-4 min-h-32 resize-none"
              name="jobDescription"
              value={form.jobDescription}
              onChange={handleChange}
              placeholder="Paste the job description or the exact topics you want the interview to target..."
            />

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" variant="accent" onClick={handleLaunchSession} disabled={creating}>
                {creating ? 'Creating session...' : 'Launch session'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleResetForm}
              >
                Reset setup
              </Button>
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={140}>
          <Panel
            title="Premium interviews"
            copy="Premium plans unlock deeper interview loops and richer feedback depth."
          >
            <div className="space-y-4">
              <div className="dark-card p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Current plan</p>
                <p className="mt-2 font-display text-3xl font-semibold">
                  {user?.subscriptionTier === 'premium' ? 'Premium' : 'Free'}
                </p>
                <p className="mt-2 text-sm text-white/70">
                  {user?.subscriptionTier === 'premium'
                    ? `${user.premiumInterviewsRemaining ?? 0} premium interviews remaining`
                    : 'Upgrade to unlock premium interview sessions and deeper coaching loops.'}
                </p>
              </div>

              {plans.map((plan) => (
                <TiltCard
                  key={plan.id}
                  className="surface-tile bg-ink-50/88 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-2xl font-semibold text-ink-950 dark:text-white">{plan.name}</p>
                      <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{plan.interviews}</p>
                    </div>
                    <span className="status-chip status-chip-danger px-3 py-2 text-sm">{plan.price}</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
                        <Icon name="check" className="h-4 w-4 text-coral-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    className="mt-5 w-full"
                    onClick={() => handlePremiumCheckout(plan.id)}
                    disabled={paymentState.loading}
                  >
                    <Icon name="card" className="h-4 w-4" />
                    {paymentState.loading ? 'Processing...' : 'Buy premium'}
                  </Button>
                </TiltCard>
              ))}
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  )
}

export default StartInterviewPage
