import { createFileRoute } from '@tanstack/react-router'
import { SidebarCommandLibraryPage } from '@/features/sidebar-command-config/library-page'

export const Route = createFileRoute('/_authenticated/sidebar-command/library')(
  {
    component: SidebarCommandLibraryPage,
  }
)
