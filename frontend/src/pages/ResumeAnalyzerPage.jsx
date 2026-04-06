import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { Button, Panel, SectionIntro } from '../components/UI'
import { Icon } from '../components/Icons'
import { getResume, uploadResume } from '../services/resumeService'

function ResumeAnalyzerPage() {
  const [resumeUrl, setResumeUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [aiEvaluation, setAiEvaluation] = useState(null)

  useEffect(() => {
    async function loadResume() {
      try {
        const data = await getResume()
        if (data.resumeUrl) setResumeUrl(data.resumeUrl)
        if (data.evaluation) setAiEvaluation(data.evaluation)
      } catch {
        setAiEvaluation(null)
      }
    }

    loadResume()
  }, [])

  async function handleFileChange(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setUploading(true)

    try {
      const data = await uploadResume(file)
      setResumeUrl(data.resumeUrl)
      setAiEvaluation(data.evaluation || null)
      toast.success(data.message || 'Resume uploaded successfully.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to upload the resume.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const resumeTips = useMemo(
    () =>
      resumeUrl
        ? [
            'Check that your latest resume matches the role you are applying for.',
            'Make sure project bullets explain impact, ownership, and technical decisions.',
            'Keep the skills section aligned with the interview tracks you are practicing.',
          ]
        : [
            'Upload a PDF resume to attach it to your account.',
            'After uploading, open the saved file and verify that it is the correct version.',
            'Use role-specific language so your interview preparation matches the document you send to recruiters.',
          ],
    [resumeUrl],
  )

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Resume analyzer"
        title="Upload and review the resume you are using for interviews."
        copy="Your resume is saved to your account, and this page gives you a checklist to review before recruiter screens and technical rounds."
      />

      <div className="page-grid">
        <Panel title="Upload resume" copy="PDF only. If Cloudinary is not configured, the app falls back to a local upload path during development.">
          <div className="dropzone-shell">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-coral-500 shadow-sm dark:bg-ink-800">
              <Icon name="upload" className="h-6 w-6" />
            </div>
            <p className="mt-4 font-display text-2xl font-semibold text-ink-950 dark:text-white">Upload your resume</p>
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-300">Attach the PDF you are currently sending with job applications.</p>
            <label className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-2xl bg-coral-500 px-5 py-3 text-sm font-semibold text-white">
              {uploading ? 'Uploading...' : 'Choose PDF'}
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            </label>
            {resumeUrl ? (
              <div className="mt-6 space-y-4 w-full">
                <div className="flex flex-col items-center justify-center space-y-1">
                  <a href={resumeUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-coral-500 hover:text-coral-600 transition-colors">
                    Open PDF in new tab
                  </a>
                  <a href={resumeUrl} download className="text-xs font-medium text-ink-500 hover:text-ink-700 dark:text-ink-300 dark:hover:text-white">
                    Download PDF
                  </a>
                  <p className="text-xs text-ink-500 dark:text-ink-300">Resume saved successfully to your profile.</p>
                </div>
                <div className="flex w-full justify-center">
                  <div className="h-[560px] w-full max-w-2xl overflow-hidden rounded-[24px] border border-ink-200 bg-white shadow-sm dark:border-white/10 dark:bg-ink-900">
                    <object data={resumeUrl} type="application/pdf" className="h-full w-full">
                      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                        <p className="text-sm text-ink-600 dark:text-ink-200">
                          PDF preview is not available in this browser for this file URL.
                        </p>
                        <a href={resumeUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-coral-500 underline">
                          Open resume in new tab
                        </a>
                      </div>
                    </object>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel title="AI Resume Analysis" copy="Live ATS rating based on your uploaded document text targeting your configured Target Role.">
          <div className="space-y-4">
            {aiEvaluation && aiEvaluation.tips ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                   <p className="text-sm font-semibold uppercase tracking-widest text-ink-500">Global Score</p>
                   <div className="score-badge">
                     {aiEvaluation.score} / 100
                   </div>
                </div>
                {aiEvaluation.tips.map((item, idx) => (
                  <div key={idx} className="feature-tile text-sm leading-6 text-ink-700 dark:text-ink-100">
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-ink-500">
                  Upload a PDF resume to generate a live AI rating and feedback checklist.
                </p>
                {resumeTips.map((tip) => (
                  <div key={tip} className="feature-tile text-sm leading-6 text-ink-700 dark:text-ink-100">
                    {tip}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}

export default ResumeAnalyzerPage
