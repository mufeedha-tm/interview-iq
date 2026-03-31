
export function exportInterviewReportPdf() {
  window.print();
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '""';
  const safe = String(value).replace(/"/g, '""');
  return `"${safe}"`;
}

function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportInterviewReportExcel(interviewData) {
  if (!interviewData) return;

  const rows = [];
  const createdAt = interviewData.createdAt ? new Date(interviewData.createdAt).toLocaleString() : '';

  rows.push(['Section', 'Field', 'Value']);
  rows.push(['Interview', 'Title', interviewData.title || '']);
  rows.push(['Interview', 'Status', interviewData.status || '']);
  rows.push(['Interview', 'Difficulty', interviewData.difficulty || '']);
  rows.push(['Interview', 'Created At', createdAt]);
  rows.push(['Results', 'Score', interviewData.results?.score ?? '']);
  rows.push(['Results', 'Feedback', interviewData.results?.feedback || '']);

  (interviewData.results?.strengths || []).forEach((item, index) => {
    rows.push(['Results', `Strength ${index + 1}`, item]);
  });

  (interviewData.results?.improvements || []).forEach((item, index) => {
    rows.push(['Results', `Improvement ${index + 1}`, item]);
  });

  (interviewData.results?.coachingTips || []).forEach((item, index) => {
    rows.push(['Results', `Coaching Tip ${index + 1}`, item]);
  });

  (interviewData.results?.rubric || []).forEach((item, index) => {
    rows.push(['Rubric', `Criterion ${index + 1}`, item.name || '']);
    rows.push(['Rubric', `Criterion ${index + 1} Score`, item.score ?? '']);
    rows.push(['Rubric', `Criterion ${index + 1} Summary`, item.summary || '']);
  });

  (interviewData.answers || []).forEach((item, index) => {
    rows.push(['Answer', `Q${index + 1}`, item.question || '']);
    rows.push(['Answer', `Q${index + 1} Response`, item.answer || '']);
    rows.push(['Answer', `Q${index + 1} Score`, item.evaluation?.score ?? '']);
    rows.push(['Answer', `Q${index + 1} Feedback`, item.evaluation?.feedback || '']);
  });

  const csvContent = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
  triggerDownload(`interviewiq-report-${Date.now()}.csv`, csvContent, 'text/csv;charset=utf-8;');
}

export function exportInterviewReportJson(reportData) {
  if (!reportData) return;
  const jsonString = JSON.stringify(reportData, null, 2);
  triggerDownload(
    `interviewiq-report-${new Date().getTime()}.json`,
    jsonString,
    'application/json;charset=utf-8'
  );
}
