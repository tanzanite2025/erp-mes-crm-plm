import { createLazyFileRoute } from '@tanstack/react-router'
import { TemplateMgmt } from '@/features/engineering/tabs/template-mgmt'

export const Route = createLazyFileRoute('/_authenticated/engineering/templates')({
  component: TemplateMgmt,
})
