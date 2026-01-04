'use client'

import { AlertTriangle, RefreshCw, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorDisplayProps {
  error: Error | null
  onRetry?: () => void
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  if (!error) return null

  // Detect Supabase/database errors
  const isSupabaseError =
    error.message.includes('supabase') ||
    error.message.includes('database') ||
    error.message.includes('RLS') ||
    error.message.includes('policy') ||
    error.message.includes('permission') ||
    error.message.includes('42501') || // PostgreSQL permission denied
    error.message.includes('PGRST')    // PostgREST error

  const isAuthError =
    error.message.includes('auth') ||
    error.message.includes('authenticated') ||
    error.message.includes('JWT') ||
    error.message.includes('token')

  const is500Error =
    error.message.includes('500') ||
    error.message.includes('Internal Server Error')

  let title = 'Nastala chyba'
  let description = error.message
  let suggestion = ''

  if (isAuthError) {
    title = 'Chyba autentifikacie'
    description = 'Vase prihlasenie vyprsalo alebo je neplatne.'
    suggestion = 'Skuste sa odhlasit a znova prihlasit.'
  } else if (isSupabaseError || is500Error) {
    title = 'Chyba databazy'
    description = 'Nepodarilo sa nacitat data z databazy.'
    suggestion = 'Skontrolujte RLS politiky v Supabase alebo spustite supabase-rls-fix.sql'
  }

  return (
    <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-4">
      <div className="flex items-start gap-3">
        {isSupabaseError || is500Error ? (
          <Database className="h-5 w-5 flex-shrink-0 text-[var(--color-error)]" />
        ) : (
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[var(--color-error)]" />
        )}
        <div className="flex-1">
          <p className="font-medium text-[var(--text-primary)]">{title}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
          {suggestion && (
            <p className="mt-2 text-sm text-[var(--color-warning)]">{suggestion}</p>
          )}
          {/* Show raw error in development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-[var(--text-secondary)]">
                Technicke detaily
              </summary>
              <pre className="mt-1 overflow-auto rounded bg-[var(--bg-secondary)] p-2 text-xs">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Skusit znova
          </Button>
        )}
      </div>
    </div>
  )
}
