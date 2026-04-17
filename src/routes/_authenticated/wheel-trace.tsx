import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { WheelTraceShellPage } from '@/features/scan-platform/pages'

export const Route = createFileRoute('/_authenticated/wheel-trace')({
  validateSearch: z.object({
    install: z.string().optional(),
    scan: z.string().optional(),
  }),
  component: WheelTraceRouteComponent,
})

function WheelTraceRouteComponent() {
  const { install, scan } = Route.useSearch()
  const scannerSignal = Number.parseInt(scan || '', 10)

  return (
    <WheelTraceShellPage
      autoPromptInstall={install === '1'}
      autoOpenScanner={Boolean(scan)}
      scannerSignal={Number.isFinite(scannerSignal) ? scannerSignal : 0}
    />
  )
}
