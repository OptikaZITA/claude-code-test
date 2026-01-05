import { redirect } from 'next/navigation'

// Redirect to main project page - kanban view is now integrated with view toggle
export default function KanbanPage({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}`)
}
