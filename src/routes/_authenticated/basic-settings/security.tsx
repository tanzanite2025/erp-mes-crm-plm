import { createFileRoute } from '@tanstack/react-router'
import { SecuritySettings } from '@/features/basic-settings/tabs/security-settings'

export const Route = createFileRoute('/_authenticated/basic-settings/security')({
  component: SecuritySettings,
})
