import { getRouteApi } from '@tanstack/react-router'
import PersonalWorkbenchCapturePage from './capture'

const personalWorkbenchCaptureRouteApi = getRouteApi(
  '/_authenticated/personal-workbench/capture'
)

export function PersonalWorkbenchCaptureRouteComponent() {
  const { autoEdit, draftId, mode } =
    personalWorkbenchCaptureRouteApi.useSearch()

  return (
    <PersonalWorkbenchCapturePage
      mode={mode ?? 'photo'}
      initialDraftId={draftId ?? null}
      autoOpenEditor={autoEdit ?? false}
    />
  )
}
