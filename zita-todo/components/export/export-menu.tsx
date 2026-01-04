'use client'

import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Dropdown, DropdownItem } from '@/components/ui/dropdown'
import { Button } from '@/components/ui/button'
import { TaskWithRelations, TimeEntry } from '@/types'
import {
  exportTasksToCSV,
  exportTasksToPDF,
  exportTimeEntriesToCSV,
  exportTimeEntriesToPDF,
} from '@/lib/utils/export'

interface ExportMenuProps {
  tasks?: TaskWithRelations[]
  timeEntries?: TimeEntry[]
  title?: string
  filename?: string
}

export function ExportMenu({
  tasks,
  timeEntries,
  title = 'Export',
  filename = 'export',
}: ExportMenuProps) {
  const hasTasks = tasks && tasks.length > 0
  const hasTimeEntries = timeEntries && timeEntries.length > 0

  if (!hasTasks && !hasTimeEntries) {
    return null
  }

  return (
    <Dropdown
      trigger={
        <Button variant="ghost" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      }
      align="right"
    >
      {hasTasks && (
        <>
          <DropdownItem
            onClick={() => exportTasksToCSV(tasks, filename)}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-[var(--color-success)]" />
            Úlohy ako CSV
          </DropdownItem>
          <DropdownItem
            onClick={() => exportTasksToPDF(tasks, title)}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4 text-[var(--color-error)]" />
            Úlohy ako PDF
          </DropdownItem>
        </>
      )}

      {hasTimeEntries && (
        <>
          <DropdownItem
            onClick={() => exportTimeEntriesToCSV(timeEntries, `${filename}-cas`)}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-[var(--color-success)]" />
            Časové záznamy ako CSV
          </DropdownItem>
          <DropdownItem
            onClick={() => exportTimeEntriesToPDF(timeEntries, `${title} - Čas`)}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4 text-[var(--color-error)]" />
            Časové záznamy ako PDF
          </DropdownItem>
        </>
      )}
    </Dropdown>
  )
}
