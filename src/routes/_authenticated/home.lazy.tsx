import { createLazyFileRoute } from '@tanstack/react-router'
import { HomeBusinessShortcutsPage } from '@/features/home/pages/home-business-shortcuts-page'

export const Route = createLazyFileRoute('/_authenticated/home')({
  component: HomeBusinessShortcutsPage,
})
