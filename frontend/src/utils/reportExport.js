
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'

function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : ''
}

function buildWorkbookRows(interviewData) {
  const rows = []

  rows.push(['Section', 'Field', 'Value'])
  rows.push(['Interview', 'Title', interviewData.title || ''])
  rows.push(['Interview', 'Status', interviewData.status || ''])
  rows.push(['Interview', 'Difficulty', interviewData.difficulty || ''])
  rows.push(['Interview', 'Created At', formatDateTime(interviewData.createdAt)])
  rows.push(['Results', 'Score', interviewData.results?.score ?? ''])
  rows.push(['Results', 'Feedback', interviewData.results?.feedback || ''])

  ;(interviewData.results?.strengths || []).forEach((item, index) => {
    rows.push(['Results', `Strength ${index + 1}`, item])
  })

  ;(interviewData.results?.improvements || []).forEach((item, index) => {
    rows.push(['Results', `Improvement ${index + 1}`, item])
  })

  ;(interviewData.results?.coachingTips || []).forEach((item, index) => {
    rows.push(['Results', `Coaching Tip ${index + 1}`, item])
  })

  ;(interviewData.results?.rubric || []).forEach((item, index) => {
    rows.push(['Rubric', `Criterion ${index + 1}`, item.name || ''])
    rows.push(['Rubric', `Criterion ${index + 1} Score`, item.score ?? ''])
    rows.push(['Rubric', `Criterion ${index + 1} Summary`, item.summary || ''])
  })

  ;(interviewData.answers || []).forEach((item, index) => {
    rows.push(['Answer', `Q${index + 1}`, item.question || ''])
    rows.push(['Answer', `Q${index + 1} Response`, item.answer || ''])
    rows.push(['Answer', `Q${index + 1} Score`, item.evaluation?.score ?? ''])
    rows.push(['Answer', `Q${index + 1} Feedback`, item.evaluation?.feedback || ''])

    ;(item.evaluation?.strengths || []).forEach((strength, strengthIndex) => {
      rows.push(['Answer', `Q${index + 1} Strength ${strengthIndex + 1}`, strength])
    })

    ;(item.evaluation?.improvements || []).forEach((improvement, improvementIndex) => {
      rows.push(['Answer', `Q${index + 1} Improvement ${improvementIndex + 1}`, improvement])
    })
  })

  return rows
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(String(text || ''), maxWidth)
  lines.forEach((line, index) => {
    doc.text(line, x, y + index * lineHeight)
  })
  return y + lines.length * lineHeight
}

function ensurePdfSpace(doc, currentY, minSpace = 20) {
  if (currentY <= 280 - minSpace) {
    return currentY
  }

  doc.addPage()
  return 20
}

export function exportInterviewReportPdf(interviewData) {
  if (!interviewData) return

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const maxWidth = pageWidth - 30
  let y = 20

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('InterviewIQ Report', 15, y)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  y = addWrappedText(doc, `Title: ${interviewData.title || ''}`, 15, y, maxWidth, 6)
  y = addWrappedText(doc, `Status: ${interviewData.status || ''}`, 15, y, maxWidth, 6)
  y = addWrappedText(doc, `Difficulty: ${interviewData.difficulty || ''}`, 15, y, maxWidth, 6)
  y = addWrappedText(doc, `Created At: ${formatDateTime(interviewData.createdAt)}`, 15, y, maxWidth, 6)
  y += 4

  const sections = [
    {
      title: 'Overall Results',
      entries: [
        `Score: ${interviewData.results?.score ?? ''}`,
        `Feedback: ${interviewData.results?.feedback || 'N/A'}`,
      ],
    },
    {
      title: 'Strengths',
      entries: interviewData.results?.strengths?.length ? interviewData.results.strengths : ['N/A'],
    },
    {
      title: 'Improvements',
      entries: interviewData.results?.improvements?.length ? interviewData.results.improvements : ['N/A'],
    },
    {
      title: 'Coaching Tips',
      entries: interviewData.results?.coachingTips?.length ? interviewData.results.coachingTips : ['N/A'],
    },
  ]

  ;(interviewData.results?.rubric || []).forEach((item, index) => {
    sections.push({
      title: `Rubric ${index + 1}: ${item.name || 'Criterion'}`,
      entries: [
        `Score: ${item.score ?? ''}`,
        `Summary: ${item.summary || 'N/A'}`,
      ],
    })
  })

  ;(interviewData.answers || []).forEach((item, index) => {
    const answerEntries = [
      `Question: ${item.question || ''}`,
      `Response: ${item.answer || ''}`,
      `Score: ${item.evaluation?.score ?? 'N/A'}`,
      `Feedback: ${item.evaluation?.feedback || 'N/A'}`,
    ]

    ;(item.evaluation?.strengths || []).forEach((strength, strengthIndex) => {
      answerEntries.push(`Strength ${strengthIndex + 1}: ${strength}`)
    })

    ;(item.evaluation?.improvements || []).forEach((improvement, improvementIndex) => {
      answerEntries.push(`Improvement ${improvementIndex + 1}: ${improvement}`)
    })

    sections.push({
      title: `Answer ${index + 1}`,
      entries: answerEntries,
    })
  })

  sections.forEach((section) => {
    y = ensurePdfSpace(doc, y, 24)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(section.title, 15, y)
    y += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)

    section.entries.forEach((entry) => {
      y = ensurePdfSpace(doc, y, 14)
      y = addWrappedText(doc, `- ${entry}`, 18, y, maxWidth - 3, 5)
      y += 1
    })

    y += 4
  })

  doc.save(`interviewiq-report-${Date.now()}.pdf`)
}

export function exportInterviewReportExcel(interviewData) {
  if (!interviewData) return

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(buildWorkbookRows(interviewData))
  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 28 },
    { wch: 90 },
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Interview Report')
  const workbookBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  triggerDownload(
    `interviewiq-report-${Date.now()}.xlsx`,
    workbookBuffer,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
}

export function exportInterviewReportJson(reportData) {
  if (!reportData) return
  const jsonString = JSON.stringify(reportData, null, 2)
  triggerDownload(
    `interviewiq-report-${new Date().getTime()}.json`,
    jsonString,
    'application/json;charset=utf-8'
  )
}
