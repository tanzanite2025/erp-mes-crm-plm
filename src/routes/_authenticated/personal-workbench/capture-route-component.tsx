import PersonalWorkbenchCapturePage from '@/features/personal-workbench/capture'
import { Route } from './capture.lazy'

export function PersonalWorkbenchCaptureRouteComponent() {
  const { autoEdit, draftId, mode } = Route.useSearch()

  return <PersonalWorkbenchCapturePage mode={mode ?? 'photo'} initialDraftId={draftId ?? null} autoOpenEditor={autoEdit ?? false} />
}
