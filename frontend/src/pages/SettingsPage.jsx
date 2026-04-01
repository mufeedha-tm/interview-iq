import { useState } from 'react'
import { toast } from 'react-toastify'
import { settingsGroups } from '../data/mockData'
import { getStoredUser } from '../lib/auth'
import { changePassword } from '../services/authService'
import { redirectToPremiumCheckout } from '../services/paymentService'
import { Button, Panel, SectionIntro, ThemeToggle } from '../components/UI'
import { useAuth } from '../context/useAuth'

function SettingsPage() {
  const { user: authUser } = useAuth()
  const user = authUser || getStoredUser()
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
  })
  const [savingPassword, setSavingPassword] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handlePasswordChange() {
    if (!form.currentPassword || !form.newPassword) {
      toast.error('Both current and new password are required.')
      return
    }

    setSavingPassword(true)

    try {
      const data = await changePassword(form)
      toast.success(data.message || 'Password changed successfully')
      setForm({
        currentPassword: '',
        newPassword: '',
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to change password.')
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleUpgradePlan() {
    if (user?.subscriptionTier === 'premium') {
      toast.info('You are already on the premium plan.')
      return
    }

    setUpgradeLoading(true)
    try {
      await redirectToPremiumCheckout('premium-pack')
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Unable to start Stripe checkout session.')
    } finally {
      setUpgradeLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Workspace settings"
        title="Control how InterviewIQ runs, reminds, and reports."
        copy="Dark mode, premium interview access, and account security all live here now."
        action={<Button variant="accent">Save preferences</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Appearance" copy="Switch the workspace theme instantly.">
          <div className="action-bar">
            <ThemeToggle />
            <p className="text-sm text-ink-500 dark:text-ink-300">Your choice is saved locally for the next visit.</p>
          </div>
        </Panel>

        <Panel title="Billing & Plan" copy="Manage your premium tier and interview credits securely via Stripe.">
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-ink-950 to-ink-900 p-6 shadow-2xl ring-1 ring-white/10 dark:from-white/5 dark:to-white/5">
            <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] font-semibold text-sky-400">Current Subscription</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="font-display text-4xl font-semibold text-white">
                    {user?.subscriptionTier === 'premium' ? 'Premium Flow' : 'Free Tier'}
                  </p>
                  <span className="text-sm font-medium text-white/60">/ {user?.subscriptionTier === 'premium' ? 'active' : 'basic limiting'}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/70 max-w-xs">
                  {user?.subscriptionTier === 'premium'
                    ? `You currently have ${user.premiumInterviewsRemaining ?? 0} premium interviews cached. Your billing cycle resets on ${
                        user.premiumExpiresAt ? new Date(user.premiumExpiresAt).toLocaleDateString() : 'the next term date'
                      }.`
                    : 'Upgrade to our Premium tier on the dashboard to unlock exhaustive AI logic and infinite mock rounds.'}
                </p>
              </div>

              {user?.subscriptionTier !== 'premium' ? (
                <Button
                  variant="accent"
                  onClick={handleUpgradePlan}
                  disabled={upgradeLoading}
                  className="shrink-0 shadow-coral-500/20 shadow-xl"
                >
                  {upgradeLoading ? 'Opening checkout...' : 'Upgrade plan'}
                </Button>
              ) : (
                <Button variant="secondary" className="shrink-0 bg-white/10 text-white ring-0 hover:bg-white/20">
                  Manage Billing
                </Button>
              )}
            </div>
            {/* Ambient Stripe decoration */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/20 blur-[80px]" />
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Change password" copy="This form uses the new protected backend change-password endpoint.">
          <div className="space-y-4">
            <input
              className="input-field"
              type="password"
              name="currentPassword"
              value={form.currentPassword}
              onChange={handleChange}
              placeholder="Current password"
            />
            <input
              className="input-field"
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              placeholder="New password"
            />
            <Button type="button" variant="secondary" onClick={handlePasswordChange} disabled={savingPassword}>
              {savingPassword ? 'Updating password...' : 'Change password'}
            </Button>
          </div>
        </Panel>

        {settingsGroups.map((group) => (
          <Panel key={group.title} title={group.title} copy="Configured for your current prep rhythm.">
            <div className="space-y-4">
              {group.items.map((item) => (
                <label key={item} className="toggle-card">
                  <input type="checkbox" className="premium-check" defaultChecked />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}

export default SettingsPage

