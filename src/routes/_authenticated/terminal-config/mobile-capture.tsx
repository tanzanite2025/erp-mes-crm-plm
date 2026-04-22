import { createFileRoute } from '@tanstack/react-router'
import { MobileCaptureTab } from '@/features/terminal-config/tabs/mobile-capture'

export const Route = createFileRoute(
  '/_authenticated/terminal-config/mobile-capture'
)({
  component: MobileCaptureTab,
})
