import { useMemo } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { House } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import { getSidebarData } from './data/sidebar-data'

export function DashboardDockButton() {
  const { t } = useLanguage()
  const pathname = useLocation({ select: (location) => location.pathname })
  const user = useAuthStore((state) => state.user)
  const isIdentitySynced = useAuthStore((state) => state.isIdentitySynced)

  const dashboardEntry = useMemo(() => {
    const sidebarData = getSidebarData(t)
    const accessibleGroups = getAccessibleNavGroups(
      user,
      sidebarData.navGroups,
      { isIdentitySynced }
    )
    const resourceGroup = accessibleGroups.find(
      (group) => group.id === 'resource-management'
    )
    const entry = resourceGroup?.children.find(
      (item) => item.id === 'dashboard' && typeof item.url === 'string'
    )

    return entry && typeof entry.url === 'string' ? entry : null
  }, [isIdentitySynced, t, user])

  if (!dashboardEntry) {
    return null
  }

  const isActive =
    pathname === '/dashboard' || pathname.startsWith('/dashboard/')

  return (
    <Button
      asChild
      variant='outline'
      size='icon'
      className={cn(
        'size-11 rounded-full border-border/70 bg-background/85 text-muted-foreground shadow-none transition-all hover:bg-accent hover:text-foreground active:scale-95 sm:active:scale-100 dark:bg-background/60',
        isActive &&
          'border-primary/30 bg-primary text-primary-foreground shadow-xl shadow-primary/15 hover:bg-primary hover:text-primary-foreground dark:bg-primary dark:text-primary-foreground'
      )}
    >
      <Link
        to={dashboardEntry.url}
        aria-label={dashboardEntry.title}
        title={dashboardEntry.title}
        aria-current={isActive ? 'page' : undefined}
      >
        <House aria-hidden='true' className='size-4' />
      </Link>
    </Button>
  )
}
