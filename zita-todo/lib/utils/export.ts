import { TaskWithRelations, TimeEntry } from '@/types'
import { format } from 'date-fns'
import { sk } from 'date-fns/locale'

// CSV Export
export function exportTasksToCSV(tasks: TaskWithRelations[], filename: string = 'ulohy'): void {
  const headers = [
    'Názov',
    'Popis',
    'Status',
    'Priorita',
    'Dátum splnenia',
    'Projekt',
    'Priradený',
    'Štítky',
    'Celkový čas (min)',
    'Vytvorené',
    'Dokončené',
  ]

  const rows = tasks.map((task) => [
    escapeCSV(task.title),
    escapeCSV(task.description || ''),
    translateStatus(task.status),
    translatePriority(task.priority),
    task.due_date ? format(new Date(task.due_date), 'd.M.yyyy') : '',
    escapeCSV(task.project?.name || ''),
    escapeCSV(task.assignee?.full_name || ''),
    escapeCSV(task.tags?.map((t) => t.name).join(', ') || ''),
    Math.round((task.total_time_seconds || 0) / 60).toString(),
    format(new Date(task.created_at), 'd.M.yyyy HH:mm'),
    task.completed_at ? format(new Date(task.completed_at), 'd.M.yyyy HH:mm') : '',
  ])

  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.join(';')),
  ].join('\n')

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF'
  downloadFile(BOM + csvContent, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv;charset=utf-8')
}

export function exportTimeEntriesToCSV(entries: TimeEntry[], filename: string = 'casove-zaznamy'): void {
  const headers = [
    'Dátum',
    'Začiatok',
    'Koniec',
    'Trvanie (min)',
    'Poznámka',
    'Typ',
  ]

  const rows = entries.map((entry) => [
    format(new Date(entry.started_at), 'd.M.yyyy'),
    format(new Date(entry.started_at), 'HH:mm'),
    entry.ended_at ? format(new Date(entry.ended_at), 'HH:mm') : 'Prebieha',
    Math.round((entry.duration_seconds || 0) / 60).toString(),
    escapeCSV(entry.note || ''),
    translateEntryType(entry.entry_type),
  ])

  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.join(';')),
  ].join('\n')

  const BOM = '\uFEFF'
  downloadFile(BOM + csvContent, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv;charset=utf-8')
}

// PDF Export (generates HTML that can be printed as PDF)
export function exportTasksToPDF(tasks: TaskWithRelations[], title: string = 'Zoznam úloh'): void {
  const htmlContent = generateTasksPDFHtml(tasks, title)
  openPrintWindow(htmlContent)
}

export function exportTimeEntriesToPDF(entries: TimeEntry[], title: string = 'Časové záznamy'): void {
  const htmlContent = generateTimeEntriesPDFHtml(entries, title)
  openPrintWindow(htmlContent)
}

// Helper functions
function escapeCSV(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    todo: 'Na vykonanie',
    in_progress: 'Prebieha',
    done: 'Dokončené',
  }
  return map[status] || status
}

function translatePriority(priority: string | null): string {
  if (!priority) return 'Žiadna'
  const map: Record<string, string> = {
    high: 'Vysoká',
    low: 'Nízka',
  }
  return map[priority] || priority
}

function translateEntryType(type: string): string {
  const map: Record<string, string> = {
    task: 'Úloha',
    shift: 'Zmena',
    break: 'Prestávka',
  }
  return map[type] || type
}

function downloadFile(content: string, filename: string, mimeType: string): void {
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

function openPrintWindow(htmlContent: string): void {
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }
}

function generateTasksPDFHtml(tasks: TaskWithRelations[], title: string): string {
  const completedCount = tasks.filter((t) => t.status === 'done').length
  const totalTime = tasks.reduce((sum, t) => sum + (t.total_time_seconds || 0), 0)

  return `
    <!DOCTYPE html>
    <html lang="sk">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #1D1D1F; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        .meta { color: #86868B; font-size: 14px; margin-bottom: 24px; }
        .summary { display: flex; gap: 24px; margin-bottom: 24px; padding: 16px; background: #F5F5F7; border-radius: 8px; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 24px; font-weight: 600; color: #007AFF; }
        .summary-label { font-size: 12px; color: #86868B; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #E5E5E5; }
        th { background: #F5F5F7; font-weight: 600; }
        .status-done { color: #34C759; }
        .status-in_progress { color: #FF9500; }
        .status-todo { color: #007AFF; }
        .priority-high { color: #EF4444; }
        .priority-low { color: #EAB308; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="meta">Vygenerované: ${format(new Date(), "d. MMMM yyyy 'o' HH:mm", { locale: sk })}</p>

      <div class="summary">
        <div class="summary-item">
          <div class="summary-value">${tasks.length}</div>
          <div class="summary-label">Celkom úloh</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${completedCount}</div>
          <div class="summary-label">Dokončených</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${Math.round(totalTime / 3600)}h ${Math.round((totalTime % 3600) / 60)}m</div>
          <div class="summary-label">Celkový čas</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Názov</th>
            <th>Status</th>
            <th>Priorita</th>
            <th>Termín</th>
            <th>Projekt</th>
            <th>Čas</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map((task) => `
            <tr>
              <td>${escapeHtml(task.title)}</td>
              <td class="status-${task.status}">${translateStatus(task.status)}</td>
              <td class="${task.priority ? 'priority-' + task.priority : ''}">${translatePriority(task.priority)}</td>
              <td>${task.due_date ? format(new Date(task.due_date), 'd.M.yyyy') : '-'}</td>
              <td>${escapeHtml(task.project?.name || '-')}</td>
              <td>${formatDuration(task.total_time_seconds || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `
}

function generateTimeEntriesPDFHtml(entries: TimeEntry[], title: string): string {
  const totalSeconds = entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0)

  return `
    <!DOCTYPE html>
    <html lang="sk">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #1D1D1F; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        .meta { color: #86868B; font-size: 14px; margin-bottom: 24px; }
        .summary { display: flex; gap: 24px; margin-bottom: 24px; padding: 16px; background: #F5F5F7; border-radius: 8px; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 24px; font-weight: 600; color: #007AFF; }
        .summary-label { font-size: 12px; color: #86868B; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #E5E5E5; }
        th { background: #F5F5F7; font-weight: 600; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="meta">Vygenerované: ${format(new Date(), "d. MMMM yyyy 'o' HH:mm", { locale: sk })}</p>

      <div class="summary">
        <div class="summary-item">
          <div class="summary-value">${entries.length}</div>
          <div class="summary-label">Záznamov</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${Math.floor(totalSeconds / 3600)}h ${Math.round((totalSeconds % 3600) / 60)}m</div>
          <div class="summary-label">Celkový čas</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Dátum</th>
            <th>Začiatok</th>
            <th>Koniec</th>
            <th>Trvanie</th>
            <th>Poznámka</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map((entry) => `
            <tr>
              <td>${format(new Date(entry.started_at), 'd.M.yyyy')}</td>
              <td>${format(new Date(entry.started_at), 'HH:mm')}</td>
              <td>${entry.ended_at ? format(new Date(entry.ended_at), 'HH:mm') : 'Prebieha'}</td>
              <td>${formatDuration(entry.duration_seconds || 0)}</td>
              <td>${escapeHtml(entry.note || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
