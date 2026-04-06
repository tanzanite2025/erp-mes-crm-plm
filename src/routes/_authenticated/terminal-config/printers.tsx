import { createFileRoute } from '@tanstack/react-router'
import { PrinterDriversTab } from '@/features/terminal-config/tabs/printer-drivers'

export const Route = createFileRoute('/_authenticated/terminal-config/printers')({
  component: PrinterDriversTab,
})
