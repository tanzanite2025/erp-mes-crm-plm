import { createLazyFileRoute } from '@tanstack/react-router'
import PersonalWorkbenchCapturePage from '@/features/personal-workbench/capture'

export const Route = createLazyFileRoute('/_authenticated/personal-workbench/capture')({
  component: PersonalWorkbenchCaptureRouteComponent,
})

function PersonalWorkbenchCaptureRouteComponent() {
  const { autoEdit, draftId, mode } = Route.useSearch()

  return <PersonalWorkbenchCapturePage mode={mode ?? 'photo'} initialDraftId={draftId ?? null} autoOpenEditor={autoEdit ?? false} />
}
