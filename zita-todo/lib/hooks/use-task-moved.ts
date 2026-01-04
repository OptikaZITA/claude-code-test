'use client'

import { useEffect } from 'react'

/**
 * Hook to listen for task:moved events and trigger a refetch
 * This is used when tasks are dragged to different sidebar sections
 */
export function useTaskMoved(refetch: () => void) {
  useEffect(() => {
    const handleTaskMoved = () => {
      refetch()
    }
    window.addEventListener('task:moved', handleTaskMoved)
    return () => window.removeEventListener('task:moved', handleTaskMoved)
  }, [refetch])
}
