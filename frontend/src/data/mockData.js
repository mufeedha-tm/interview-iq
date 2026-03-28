export const appNav = [
  { label: 'Dashboard', path: '/dashboard', icon: 'home' },
  { label: 'Start Interview', path: '/start-interview', icon: 'spark' },
  { label: 'Interview Session', path: '/interview-session', icon: 'mic' },
  { label: 'Results', path: '/results', icon: 'chart' },
  { label: 'Interview History', path: '/history', icon: 'clock' },
  { label: 'Resume Analyzer', path: '/resume-analyzer', icon: 'doc' },
  { label: 'Profile', path: '/profile', icon: 'user' },
  { label: 'Settings', path: '/settings', icon: 'settings' },
]

export const heroStats = [
  { label: 'Mock interviews completed', value: '12.4k' },
  { label: 'Average score uplift', value: '+37%' },
  { label: 'Hiring teams using InterviewIQ', value: '320+' },
]

export const dashboardMetrics = [
  { label: 'Weekly streak', value: '8 days', change: '+2 vs last week' },
  { label: 'Confidence score', value: '91%', change: '+6 points' },
  { label: 'Interviews this month', value: '18', change: '3 scheduled today' },
]

export const scoreTrendData = [
  { label: 'Feb 10', score: 72 },
  { label: 'Feb 18', score: 76 },
  { label: 'Feb 25', score: 81 },
  { label: 'Mar 03', score: 84 },
  { label: 'Mar 10', score: 88 },
  { label: 'Mar 17', score: 91 },
]

export const interviewsPerMonthData = [
  { month: 'Oct', interviews: 4 },
  { month: 'Nov', interviews: 6 },
  { month: 'Dec', interviews: 7 },
  { month: 'Jan', interviews: 9 },
  { month: 'Feb', interviews: 12 },
  { month: 'Mar', interviews: 18 },
]

export const skillImprovementData = [
  { skill: 'Communication', previous: 68, current: 90 },
  { skill: 'System Design', previous: 61, current: 84 },
  { skill: 'Problem Solving', previous: 70, current: 89 },
  { skill: 'Leadership', previous: 58, current: 82 },
  { skill: 'Confidence', previous: 64, current: 86 },
]

export const coachingMoments = [
  {
    title: 'Behavioral storytelling',
    copy: 'Your STAR responses are concise, but could use stronger outcome framing.',
  },
  {
    title: 'System design depth',
    copy: 'Architecture choices are solid. Practice trade-off explanations under time pressure.',
  },
  {
    title: 'Leadership communication',
    copy: 'Panel feedback shows high clarity. Add more metrics when describing impact.',
  },
]

export const focusTracks = [
  'Frontend Engineering',
  'Backend Engineering',
  'Product Management',
  'Data Science',
  'Engineering Leadership',
]

export const livePrompts = [
  'Walk me through a project where you improved performance under tight constraints.',
  'How would you redesign a search ranking service for global scale?',
  'Tell me about a disagreement with a stakeholder and how you resolved it.',
]

export const scoreBreakdown = [
  { label: 'Communication', score: 94, tone: 'from-mint-300 to-sky-300' },
  { label: 'Technical depth', score: 88, tone: 'from-gold-300 to-coral-400' },
  { label: 'Problem solving', score: 91, tone: 'from-sky-300 to-mint-300' },
  { label: 'Confidence', score: 85, tone: 'from-coral-400 to-gold-300' },
]

export const reportTrendData = [
  { stage: 'Warmup', score: 78 },
  { stage: 'Behavioral', score: 89 },
  { stage: 'Technical', score: 91 },
  { stage: 'System design', score: 88 },
  { stage: 'Closing', score: 93 },
]

export const premiumPlans = [
  {
    id: 'premium-pack',
    name: 'Premium Interview Pack',
    price: '$49',
    interviews: '10 premium interviews',
    features: [
      'Advanced AI follow-up questions',
      'Deep benchmark analytics',
      'Priority PDF report exports',
    ],
  },
]

export const historyRows = [
  { role: 'Senior Frontend Engineer', date: 'Mar 17', score: '92%', status: 'Strong hire' },
  { role: 'Product Manager', date: 'Mar 15', score: '86%', status: 'Hire' },
  { role: 'Staff Engineer', date: 'Mar 11', score: '79%', status: 'Needs review' },
  { role: 'Engineering Manager', date: 'Mar 08', score: '90%', status: 'Strong hire' },
]

export const resumeInsights = [
  'Add quantified outcomes to your top three bullet points.',
  'Reorder skills so the role-critical stack appears before tooling.',
  'Your summary is strong, but the leadership section can be shortened.',
]

export const profileHighlights = [
  'Target roles: Senior Frontend Engineer, Staff Product Engineer',
  'Preferred interview style: High-pressure simulation with direct feedback',
  'Top strengths: Storytelling, prioritization, debugging under ambiguity',
]

export const settingsGroups = [
  {
    title: 'Interview preferences',
    items: ['Default interview length: 35 mins', 'Voice AI tone: Direct and supportive', 'Camera prompts enabled'],
  },
  {
    title: 'Notifications',
    items: ['Daily practice reminder at 7:30 PM', 'Weekly progress digest every Sunday', 'Email summaries enabled'],
  },
]
