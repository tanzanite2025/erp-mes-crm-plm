import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { WheelTraceShellPage } from '@/features/scan-platform/pages'

export const Route = createFileRoute('/_authenticated/wheel-trace')({
  validateSearch: z.object({
    install: z.string().optional(),
  }),
  component: WheelTraceRouteComponent,
})

function WheelTraceRouteComponent() {
  const { install } = Route.useSearch()
  return <WheelTraceShellPage autoPromptInstall={install === '1'} />
}
