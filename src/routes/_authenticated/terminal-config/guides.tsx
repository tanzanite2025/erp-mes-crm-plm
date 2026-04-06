import { createFileRoute } from '@tanstack/react-router'
import { InstallGuidesTab } from '@/features/terminal-config/tabs/install-guides'

export const Route = createFileRoute('/_authenticated/terminal-config/guides')({
  component: InstallGuidesTab,
})
