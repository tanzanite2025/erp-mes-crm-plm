import { createFileRoute } from '@tanstack/react-router'
import { ScannerDevicesTab } from '@/features/terminal-config/tabs/scanner-devices'

export const Route = createFileRoute(
  '/_authenticated/terminal-config/scanners'
)({
  component: ScannerDevicesTab,
})
