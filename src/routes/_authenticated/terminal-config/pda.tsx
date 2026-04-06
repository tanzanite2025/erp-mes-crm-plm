import { createFileRoute } from '@tanstack/react-router'
import { PDATerminalTab } from '@/features/terminal-config/tabs/pda-terminal'

export const Route = createFileRoute('/_authenticated/terminal-config/pda')({
  component: PDATerminalTab,
})
