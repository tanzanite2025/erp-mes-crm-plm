import { createLazyFileRoute } from '@tanstack/react-router'
import PersonalWorkbenchPage from '@/features/personal-workbench'

export const Route = createLazyFileRoute('/_authenticated/personal-workbench/')({
  component: PersonalWorkbenchPage,
})
