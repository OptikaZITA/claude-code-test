'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSlackChannelConfigs } from '@/lib/hooks/use-slack-integration'
import { useAreas } from '@/lib/hooks/use-areas'
import { createClient } from '@/lib/supabase/client'
import { SlackChannelConfig, TaskPriority, Project } from '@/types'

interface SlackChannelConfigModalProps {
  isOpen: boolean
  onClose: () => void
  config?: SlackChannelConfig
}

export function SlackChannelConfigModal({
  isOpen,
  onClose,
  config,
}: SlackChannelConfigModalProps) {
  const [mounted, setMounted] = useState(false)
  const { createConfig, updateConfig } = useSlackChannelConfigs()
  const { areas } = useAreas()
  const [projects, setProjects] = useState<Project[]>([])
  const supabase = createClient()

  // Client-side mount check for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active')
        .order('name')
      setProjects(data || [])
    }
    fetchProjects()
  }, [supabase])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [channelId, setChannelId] = useState('')
  const [channelName, setChannelName] = useState('')
  const [areaId, setAreaId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [deadlineDays, setDeadlineDays] = useState(7)
  const [priority, setPriority] = useState<TaskPriority>('low')
  const [isActive, setIsActive] = useState(true)

  // Populate form when editing
  useEffect(() => {
    if (config) {
      setChannelId(config.slack_channel_id)
      setChannelName(config.slack_channel_name)
      setAreaId(config.area_id)
      setProjectId(config.project_id)
      setDeadlineDays(config.default_deadline_days)
      setPriority(config.default_priority)
      setIsActive(config.is_active)
    } else {
      // Reset form for new config
      setChannelId('')
      setChannelName('')
      setAreaId(null)
      setProjectId(null)
      setDeadlineDays(7)
      setPriority('low')
      setIsActive(true)
    }
  }, [config])

  // Filter projects by selected area
  const filteredProjects = areaId
    ? projects.filter((p) => p.area_id === areaId)
    : projects

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!channelId.trim() || !channelName.trim()) {
      setError('Vyplňte ID kanála a názov')
      return
    }

    setIsSubmitting(true)

    try {
      const data = {
        slack_channel_id: channelId.trim(),
        slack_channel_name: channelName.trim().replace(/^#/, ''),
        area_id: areaId,
        project_id: projectId,
        default_deadline_days: deadlineDays,
        default_priority: priority,
        is_active: isActive,
      }

      if (config) {
        await updateConfig(config.id, data)
      } else {
        await createConfig(data)
      }

      onClose()
    } catch (err) {
      console.error('Error saving config:', err)
      setError('Nepodarilo sa uložiť konfiguráciu')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="relative z-[9999] w-full max-w-md rounded-lg bg-[var(--bg-primary)] shadow-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-primary)] shrink-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {config ? 'Upraviť kanál' : 'Pridať kanál'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-[var(--bg-hover)]"
          >
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="px-6 py-5 flex-1 overflow-y-auto">
          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel ID */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Slack Channel ID *
            </label>
            <Input
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="C0948ASG3KN"
              disabled={!!config}
            />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Nájdete v Slack: Kliknite pravým na kanál → View channel details → ID je na konci
            </p>
          </div>

          {/* Channel Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Názov kanála *
            </label>
            <Input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="#objednavky-ramov"
            />
          </div>

          {/* Area */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Oddelenie
            </label>
            <select
              value={areaId || ''}
              onChange={(e) => {
                setAreaId(e.target.value || null)
                setProjectId(null) // Reset project when area changes
              }}
              className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="">Bez oddelenia</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Projekt
            </label>
            <select
              value={projectId || ''}
              onChange={(e) => setProjectId(e.target.value || null)}
              className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="">Bez projektu</option>
              {filteredProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Deadline Days */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Predvolený deadline (dní)
            </label>
            <Input
              type="number"
              min={1}
              max={365}
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(parseInt(e.target.value) || 7)}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Predvolená priorita
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="low">Nízka</option>
              <option value="high">Vysoká</option>
            </select>
          </div>

          {/* Active Toggle */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border-primary)] text-[var(--color-primary)]"
            />
            <span className="text-sm text-[var(--text-primary)]">
              Aktívny (vytvárať úlohy z tohto kanála)
            </span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Zrušiť
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ukladám...
                </>
              ) : config ? (
                'Uložiť'
              ) : (
                'Pridať'
              )}
            </Button>
          </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
