import { createLazyFileRoute } from '@tanstack/react-router'
import PersonalWorkspacePage from '@/features/personal-workbench/workspace'

export const Route = createLazyFileRoute('/_authenticated/personal-workbench/workspace')({
  component: PersonalWorkspacePage,
})
