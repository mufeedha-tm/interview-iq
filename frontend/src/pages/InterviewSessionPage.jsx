import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Button, Panel, SectionIntro } from '../components/UI'
import { Icon } from '../components/Icons'
import { Reveal, TiltCard } from '../components/PremiumEffects'
import { fetchInterview, generateInterviewEngine, submitInterviewAnswer, updateInterviewResults, requestNextQuestion, uploadInterviewMedia } from '../services/interviewService'

function getLiveAnswerCues(answer = '') {
  const trimmed = answer.trim()
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : []
  const structureMarkers = ['situation', 'task', 'action', 'result'].filter((item) =>
    trimmed.toLowerCase().includes(item),
  )
  const technicalMarkers = ['api', 'performance', 'component', 'database', 'cache', 'testing', 'state'].filter((item) =>
    trimmed.toLowerCase().includes(item),
  )

  return [
    {
      label: 'Answer length',
      value: `${words.length} words`,
      hint: words.length >= 80 ? 'Strong depth' : 'Add more detail and context',
    },
    {
      label: 'STAR structure',
      value: structureMarkers.length ? `${structureMarkers.length} markers found` : 'Not detected yet',
      hint: structureMarkers.length >= 2 ? 'Good structure' : 'Try adding situation, action, and result',
    },
    {
      label: 'Metrics',
      value: /\d/.test(trimmed) ? 'Included' : 'Missing',
      hint: /\d/.test(trimmed) ? 'Numbers make impact clearer' : 'Add measurable outcomes if possible',
    },
    {
      label: 'Technical depth',
      value: technicalMarkers.length ? `${technicalMarkers.length} topic cues` : 'Basic',
      hint: technicalMarkers.length >= 2 ? 'Shows implementation detail' : 'Add trade-offs or implementation decisions',
    },
  ]
}

function mapAnswersByQuestionIndex(questions = [], savedAnswers = []) {
  const mapped = {}
  const consumed = new Set()

  questions.forEach((question, index) => {
    const matchedAnswerIndex = savedAnswers.findIndex(
      (item, answerIndex) => !consumed.has(answerIndex) && item?.question === question,
    )

    if (matchedAnswerIndex >= 0) {
      mapped[index] = savedAnswers[matchedAnswerIndex]?.answer || ''
      consumed.add(matchedAnswerIndex)
    }
  })

  return mapped
}

function InterviewSessionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const interviewId = searchParams.get('interviewId')
  const [interview, setInterview] = useState(null)
  const [answers, setAnswers] = useState({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [recorderState, setRecorderState] = useState({
    recording: false,
    previewUrl: '',
    mode: 'audio',
    recordedBlob: null,
  })
  const [timeLeft, setTimeLeft] = useState(180) 
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    async function loadInterview() {
      if (!interviewId) {
        toast.error('No interview session was selected.')
        navigate('/start-interview')
        return
      }

      try {
        const { interview: interviewData } = await fetchInterview(interviewId)
        setInterview(interviewData)

        const existingAnswers = mapAnswersByQuestionIndex(interviewData.questions || [], interviewData.answers || [])
        setAnswers(existingAnswers)
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load the interview session.')
        navigate('/history')
      } finally {
        setLoading(false)
      }
    }

    loadInterview()

    return () => {
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop()
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [interviewId, navigate])

  useEffect(() => {
    if (loading || finishing || !interview || currentIndex >= interview.questions?.length) {
      return
    }

    setTimeLeft(180)

    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          void handleTimedAutosave()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [currentIndex, loading, finishing, interview])

  const questions = useMemo(() => interview?.questions || [], [interview])
  const currentQuestion = questions[currentIndex] || ''
  const currentAnswer = answers[currentIndex] || ''
  const answeredCount = useMemo(
    () => questions.filter((_question, index) => String(answers[index] || '').trim()).length,
    [answers, questions],
  )
  const liveCues = useMemo(() => getLiveAnswerCues(currentAnswer), [currentAnswer])

  const handleTimedAutosave = useEffectEvent(async () => {
    toast.warning('Time is up for this question! Auto-saving...')
    await handleSaveCurrentAnswer({ allowEmpty: true, advance: true })
  })

  function handleAnswerChange(event) {
    const value = event.target.value
    setAnswers((current) => ({
      ...current,
      [currentIndex]: value,
    }))
  }

  async function handleSaveCurrentAnswer(options = {}) {
    const { allowEmpty = false, advance = true } = options
    const answerToSave = currentAnswer.trim()

    if (!currentQuestion) {
      toast.error('No active question to save.')
      return null
    }

    if (!answerToSave && !allowEmpty) {
      toast.error('Write an answer before saving.')
      return null
    }

    setSubmitting(true)

    try {
      const normalizedAnswerToSave = answerToSave || '(No answer provided within time limit)'
      const { interview: updatedInterview } = await submitInterviewAnswer(interviewId, {
        answers: [{ question: currentQuestion, answer: normalizedAnswerToSave }],
      })

      if (recorderState.recordedBlob) {
        toast.info('Uploading media recording...')
        try {
          await uploadInterviewMedia(interviewId, currentQuestion, recorderState.recordedBlob)
        } catch {
          toast.error('Failed to upload recording, but text answer was saved.')
        }
      }

      setRecorderState((current) => ({ ...current, previewUrl: '', recordedBlob: null }))

      if (currentIndex >= 1 && currentIndex < updatedInterview.questions.length - 1) {
        toast.info('AI is generating the next adaptive question...', { autoClose: 2000 })
        const { nextQuestion } = await requestNextQuestion(interviewId, {
          question: currentQuestion,
          answer: normalizedAnswerToSave,
          currentIndex,
        })
        if (nextQuestion) {
          updatedInterview.questions = [...updatedInterview.questions.slice(0, currentIndex + 1), nextQuestion, ...updatedInterview.questions.slice(currentIndex + 2)]
        }
      }

      setInterview(updatedInterview)
      if (answerToSave) {
        toast.success('Answer saved.')
      }
      
      if (advance && currentIndex < updatedInterview.questions.length - 1) {
        setCurrentIndex((c) => c + 1)
      }
      return updatedInterview
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save this answer.')
      return null
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFinishInterview(latestQuestions = questions) {
    const unanswered = latestQuestions.filter((_question, index) => !String(answers[index] || '').trim())

    if (unanswered.length > 0 && latestQuestions === questions) {
      toast.info('Finishing interview with some unanswered questions. You can revisit this later in history.')
    }

    setFinishing(true)

    try {
      await submitInterviewAnswer(interviewId, {
        answers: latestQuestions.map((question, index) => ({
          question,
          answer: String(answers[index] || '').trim() || '(No answer provided within time limit)',
        })),
      })

      const evaluations = []
      await Promise.all(
        latestQuestions.map(async (question, index) => {
          const answerText = String(answers[index] || '').trim() || '(No answer provided within time limit)'
          const res = await generateInterviewEngine({
            role: interview.title,
            interviewType: 'mixed',
            difficulty: interview.difficulty,
            skills: interview.skills,
            question,
            answer: answerText,
            questionCount: 1,
          })
          
          evaluations.push({
            question,
            evaluation: {
              score: res.answerEvaluation?.overallScore ?? 0,
              feedback: res.feedback?.summary || '',
              strengths: (res.feedback?.strengths || []).slice(0, 2),
              improvements: (res.feedback?.improvements || []).slice(0, 2),
            }
          })
        })
      )

      const globalEvaluation = await generateInterviewEngine({
        role: interview.title,
        interviewType: 'mixed',
        difficulty: interview.difficulty,
        skills: interview.skills,
        question: latestQuestions.join(' '),
        answer: latestQuestions
          .map((question, index) => `Q: ${question}\nA: ${String(answers[index] || '').trim() || '(No answer provided within time limit)'}`)
          .join('\n\n'),
      })

      await updateInterviewResults(interviewId, {
        score: globalEvaluation.answerEvaluation?.overallScore ?? 0,
        feedback: globalEvaluation.feedback?.summary || 'Interview completed',
        rubric: globalEvaluation.answerEvaluation?.rubric || [],
        strengths: globalEvaluation.feedback?.strengths || [],
        improvements: globalEvaluation.feedback?.improvements || [],
        coachingTips: globalEvaluation.feedback?.coachingTips || [],
        followUpQuestions: (globalEvaluation.followUpQuestions || []).map((item) => item.question),
        answerEvaluations: evaluations,
        status: 'completed',
      })

      toast.success('Interview completed. Opening your report.')
      navigate(`/results?interviewId=${interviewId}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to finish the interview.')
    } finally {
      setFinishing(false)
    }
  }

  async function handleRecording(mode) {
    if (recorderState.recording) {
      mediaRecorderRef.current?.stop()
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Media recording is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        mode === 'video' ? { audio: true, video: true } : { audio: true, video: false },
      )

      mediaStreamRef.current = stream

      const recorder = new MediaRecorder(stream)
      const chunks = []
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mode === 'video' ? 'video/webm' : 'audio/webm' })
        const previewUrl = URL.createObjectURL(blob)
        setRecorderState({
          recording: false,
          previewUrl,
          mode,
          recordedBlob: blob,
        })
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.start()
      setRecorderState({
        recording: true,
        previewUrl: '',
        mode,
      })
      toast.success(`Started ${mode} recording.`)

      window.setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop()
          toast.info(`${mode} recording saved for preview.`)
        }
      }, 12000)
    } catch (error) {
      toast.error(error.message || `Unable to start ${mode} recording.`)
    }
  }

  if (loading) {
    return <div className="loading-shell text-sm text-ink-500">Loading interview session...</div>
  }

  if (!interview) {
    return null
  }

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Real-Time session"
        title={interview.title}
        copy="Move through each question under a strict 3-minute timer. The AI will adapt follow-up questions sequentially based on your previous answers."
        action={
          <div className="flex gap-4 items-center">
            <div className="rounded-full bg-coral-500/10 px-4 py-2 text-sm font-semibold text-coral-600 dark:text-coral-400">
              {answeredCount} of {questions.length} answered
            </div>
            <div className={`rounded-full px-4 py-2 text-sm font-bold ${timeLeft <= 30 ? 'bg-red-500/10 text-red-500 animate-pulse' : 'bg-ink-100 text-ink-950 dark:bg-white/10 dark:text-white'}`}>
              Timer {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </div>
        }
      />

      <Reveal>
        <div className="dashboard-band">
          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-center">
            <div className="space-y-4">
              <span className="pill">Live interview mode</span>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-950 md:text-5xl dark:text-white">
                Practice in a focused session with questions, recording, answer cues, and final scoring in one flow.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-ink-500 md:text-base dark:text-ink-300">
                This page is built around the real interview record. Your current question, saved answers, media preview, and final evaluation all connect back to the same backend session.
              </p>
            </div>

            <TiltCard className="dark-card p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/55">Session status</p>
                  <p className="mt-2 font-display text-2xl font-semibold">Round in progress</p>
                </div>
                <div className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                  Live
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-white/7 px-4 py-3 text-sm text-white/82">Difficulty: {interview.difficulty}</div>
                <div className="rounded-2xl bg-white/7 px-4 py-3 text-sm text-white/82">
                  Skills: {(interview.skills || []).join(', ') || 'Not specified'}
                </div>
                <div className="rounded-2xl bg-white/7 px-4 py-3 text-sm text-white/82">
                  Recording: {recorderState.recording ? `Capturing ${recorderState.mode}` : 'Ready'}
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
        <Reveal delay={80}>
          <Panel title={`Question ${currentIndex + 1}`} copy={`Difficulty: ${interview.difficulty}`}>
            <div className="space-y-5">
              <TiltCard className="video-shell overflow-hidden p-6 relative">
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-coral-400 transition-all duration-1000 ease-linear" 
                  style={{ width: `${(timeLeft / 180) * 100}%` }}
                />
                <div className="relative">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                      Prompt {currentIndex + 1} of {questions.length}
                    </p>
                    {timeLeft <= 10 && <span className="text-xs font-bold text-red-400 uppercase">Warning: Time is expiring</span>}
                  </div>
                  <p className="font-display text-3xl font-semibold text-white">{currentQuestion}</p>
                </div>
              </TiltCard>

              <textarea
                className="input-field min-h-44 resize-none"
                value={currentAnswer}
                onChange={handleAnswerChange}
                placeholder="Write your answer here..."
              />

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {liveCues.map((item) => (
                  <TiltCard
                    key={item.label}
                    className="surface-tile bg-ink-50/88 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-ink-400 dark:text-ink-300">{item.label}</p>
                    <p className="mt-3 font-display text-xl font-semibold text-ink-950 dark:text-white">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-ink-300">{item.hint}</p>
                  </TiltCard>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentIndex((current) => Math.max(current - 1, 0))}
                  disabled={currentIndex === 0 || submitting}
                >
                  Previous
                </Button>
                <Button type="button" variant="primary" onClick={() => handleSaveCurrentAnswer({ allowEmpty: false, advance: true })} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save & Continue'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => handleRecording('audio')}>
                  <Icon name="mic" className="h-4 w-4" />
                  {recorderState.recording && recorderState.mode === 'audio' ? 'Stop audio' : 'Record audio'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => handleRecording('video')}>
                  <Icon name="camera" className="h-4 w-4" />
                  {recorderState.recording && recorderState.mode === 'video' ? 'Stop video' : 'Record video'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCurrentIndex((current) => Math.min(current + 1, questions.length - 1))}
                  disabled={currentIndex === questions.length - 1 || submitting || !String(answers[currentIndex] || '').trim()}
                >
                  Skip
                </Button>
                <Button
                  type="button"
                  variant="accent"
                  onClick={async () => {
                    const updatedInterview = await handleSaveCurrentAnswer({ allowEmpty: true, advance: false })
                    if (updatedInterview) {
                      await handleFinishInterview(updatedInterview.questions || questions)
                    }
                  }}
                  disabled={finishing}
                >
                  {finishing ? 'Finishing...' : 'Finish interview'}
                </Button>
              </div>
            </div>
          </Panel>
        </Reveal>

        <div className="space-y-6">
          <Reveal delay={140}>
            <Panel title="Recording preview" copy="Use this to practice with your actual voice or camera.">
              <TiltCard className="video-shell p-4">
                <div className="relative min-h-[240px]">
                  {recorderState.previewUrl ? (
                    recorderState.mode === 'video' ? (
                      <video controls className="w-full rounded-[24px]" src={recorderState.previewUrl} />
                    ) : (
                      <div className="glass-media flex h-full min-h-[220px] flex-col items-center justify-center gap-4 p-6 text-white">
                        <Icon name="waves" className="h-10 w-10 text-coral-300" />
                        <p className="font-display text-2xl font-semibold">Audio answer captured</p>
                        <audio controls className="w-full" src={recorderState.previewUrl} />
                      </div>
                    )
                  ) : (
                    <div className="glass-media flex h-full min-h-[220px] flex-col items-center justify-center gap-4 p-6 text-center text-white/74">
                      <Icon name="camera" className="h-10 w-10 text-coral-300" />
                      <p className="font-display text-2xl font-semibold text-white">No preview yet</p>
                      <p className="max-w-xs text-sm leading-6">
                        Record audio or video to create a preview clip while you practice this question.
                      </p>
                    </div>
                  )}
                </div>
              </TiltCard>
            </Panel>
          </Reveal>

          <Reveal delay={200}>
            <Panel title="Question list" copy="Move around the session and see what is already answered.">
              <div className="space-y-3">
                {questions.map((question, index) => {
                  const isAnswered = Boolean(String(answers[index] || '').trim())
                  const isLocked = index > currentIndex && !String(answers[index - 1] || '').trim()

                  return (
                    <button
                      key={`${index}-${question}`}
                      type="button"
                      onClick={() => !isLocked && setCurrentIndex(index)}
                      disabled={isLocked}
                      className={`w-full rounded-3xl border p-4 text-left transition ${
                        index === currentIndex
                          ? 'border-coral-300 bg-coral-50 dark:bg-coral-500/10'
                          : isLocked
                            ? 'border-ink-100 bg-ink-50 opacity-40 cursor-not-allowed dark:border-white/5 dark:bg-black/20'
                            : 'border-ink-100 bg-white/84 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_30px_rgba(7,17,31,0.08)] dark:border-white/8 dark:bg-white/4 dark:hover:bg-white/7'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink-950 dark:text-white">Question {index + 1}</p>
                        <span
                          className={`status-chip ${
                            isLocked ? 'status-chip-neutral' : isAnswered ? 'status-chip-success' : 'status-chip-warning'
                          }`}
                        >
                          {isLocked ? 'Locked' : isAnswered ? 'Answered' : 'Pending'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink-600 dark:text-ink-300">{question}</p>
                    </button>
                  )
                })}
              </div>
            </Panel>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

export default InterviewSessionPage

