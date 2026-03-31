import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { Button, Panel, SectionIntro } from '../components/UI'
import { useAuth } from '../context/useAuth'
import { getCurrentUser, updateProfile, uploadAvatar } from '../services/authService'
import { JOB_ROLES } from '../data/jobRoles'

function ProfilePage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    headline: '',
    targetRole: '',
    experienceLevel: '',
    bio: '',
    avatarUrl: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { user: globalUser, updateUserContext } = useAuth()
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!globalUser) return
    setForm((current) => ({
      ...current,
      ...globalUser,
    }))
  }, [globalUser])

  useEffect(() => {
    async function loadUser() {
      try {
        const { user } = await getCurrentUser()
        updateUserContext(user)
        setForm((current) => ({
          ...current,
          ...user,
        }))
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load profile details.')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [updateUserContext])

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

  function validateProfile() {
    const nextErrors = {}
    if (!form.firstName.trim()) nextErrors.firstName = 'First name is required.'
    if (!form.lastName.trim()) nextErrors.lastName = 'Last name is required.'
    if (!form.experienceLevel.trim()) nextErrors.experienceLevel = 'Experience level is required.'
    if (!form.targetRole.trim()) nextErrors.targetRole = 'Target role is required.'
    if (form.bio && form.bio.length > 600) nextErrors.bio = 'Bio should be 600 characters or less.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSaveProfile() {
    if (!validateProfile()) {
      toast.error('Fix the highlighted fields before saving your profile.')
      return
    }
    setSaving(true)

    try {
      const { user, message } = await updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        headline: form.headline,
        targetRole: form.targetRole,
        experienceLevel: form.experienceLevel,
        bio: form.bio,
      })

      updateUserContext(user)
      setForm((current) => ({
        ...current,
        ...user,
      }))
      toast.success(message)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save profile changes.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setUploading(true)

    try {
      const { user, message } = await uploadAvatar(file)
      updateUserContext(user)
      setForm((current) => ({
        ...current,
        ...user,
      }))
      toast.success(message)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to upload profile image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Candidate profile"
        title="Keep your practice environment aligned with your career target."
        copy="Update your name, role, experience level, bio, and profile image so interview questions and analytics stay relevant to your target job."
        action={
          <Button type="button" variant="secondary" onClick={handleSaveProfile} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save profile'}
          </Button>
        }
      />

      <div className="page-grid">
        <Panel title="Profile details" copy="The information that shapes your interview simulations.">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] bg-ink-950 text-2xl font-semibold text-white">
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span>{(form.firstName?.[0] || 'I').toUpperCase()}</span>
              )}
            </div>
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 dark:border-white/10 dark:bg-ink-800 dark:text-white">
              {uploading ? 'Uploading image...' : 'Upload profile image'}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <input
                className={`input-field ${errors.firstName ? 'border-red-500' : ''}`}
                name="firstName"
                value={form.firstName || ''}
                onChange={handleChange}
                placeholder="First name"
              />
              {errors.firstName ? <p className="text-xs text-red-500">{errors.firstName}</p> : null}
            </div>
            <div className="space-y-1">
              <input
                className={`input-field ${errors.lastName ? 'border-red-500' : ''}`}
                name="lastName"
                value={form.lastName || ''}
                onChange={handleChange}
                placeholder="Last name"
              />
              {errors.lastName ? <p className="text-xs text-red-500">{errors.lastName}</p> : null}
            </div>
            <input className="input-field" value={form.email || ''} readOnly placeholder="Email" />
            <div className="space-y-1">
              <input
                className={`input-field ${errors.experienceLevel ? 'border-red-500' : ''}`}
                name="experienceLevel"
                value={form.experienceLevel || ''}
                onChange={handleChange}
                placeholder="Experience level"
              />
              {errors.experienceLevel ? <p className="text-xs text-red-500">{errors.experienceLevel}</p> : null}
            </div>
            <input
              className="input-field md:col-span-2"
              name="headline"
              value={form.headline || ''}
              onChange={handleChange}
              placeholder="Headline"
            />
            <div className="space-y-1 md:col-span-2">
              <select
                className={`input-field ${errors.targetRole ? 'border-red-500' : ''}`}
                name="targetRole"
                value={form.targetRole || ''}
                onChange={handleChange}
              >
                <option value="">Select target role</option>
                {form.targetRole && !JOB_ROLES.includes(form.targetRole) ? (
                  <option value={form.targetRole}>{form.targetRole}</option>
                ) : null}
                {JOB_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {errors.targetRole ? <p className="text-xs text-red-500">{errors.targetRole}</p> : null}
            </div>
          </div>

          <textarea
            className="input-field mt-4 min-h-32 resize-none"
            name="bio"
            value={form.bio || ''}
            onChange={handleChange}
            placeholder="Tell InterviewIQ about your experience and goals..."
          />
          {errors.bio ? <p className="mt-1 text-xs text-red-500">{errors.bio}</p> : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" variant="accent" onClick={handleSaveProfile} disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save profile'}
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 dark:border-white/10 dark:bg-ink-800 dark:text-white">
              {uploading ? 'Uploading image...' : 'Upload profile image'}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
        </Panel>

        <Panel title="Profile progress" copy="Keep your profile updated so interview questions match your real target role and experience.">
          <div className="space-y-4">
            <div className="rounded-3xl bg-ink-50 p-4 text-sm leading-6 text-ink-700 dark:bg-white/4 dark:text-ink-100">
              <strong>Role targeting:</strong> Your selected target role directly shapes the interview questions generated in each session.
            </div>
            <div className="rounded-3xl bg-ink-50 p-4 text-sm leading-6 text-ink-700 dark:bg-white/4 dark:text-ink-100">
              <strong>Experience alignment:</strong> Keep your experience level and bio accurate for better coaching tips and evaluation feedback.
            </div>
            <div className="rounded-3xl bg-ink-50 p-4 text-sm leading-6 text-ink-700 dark:bg-white/4 dark:text-ink-100">
              <strong>Status:</strong> {loading ? 'Loading profile...' : 'Profile is synced and ready for interview personalization'}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

export default ProfilePage
