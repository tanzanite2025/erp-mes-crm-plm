import { createFileRoute } from '@tanstack/react-router'
import { PDAShellTab } from '@/features/terminal-config/tabs/pda-shell'

export const Route = createFileRoute('/_authenticated/pda-shell')({
  component: PDAShellTab,
})
