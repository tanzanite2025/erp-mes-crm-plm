import { createFileRoute } from '@tanstack/react-router'
import { DriverDownloadsTab } from '@/features/terminal-config/tabs/driver-downloads'

export const Route = createFileRoute('/_authenticated/terminal-config/downloads')({
  component: DriverDownloadsTab,
})
