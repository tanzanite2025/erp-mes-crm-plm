import PersonalWorkbenchCapturePage from '@/features/personal-workbench/capture'
import { Route } from './capture.lazy'

export function PersonalWorkbenchCaptureRouteComponent() {
  const { mode } = Route.useSearch()

  return <PersonalWorkbenchCapturePage mode={mode ?? 'photo'} />
}
