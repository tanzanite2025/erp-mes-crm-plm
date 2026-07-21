import { useEffect, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitch } from '@/components/language-switch'
import { AuthDebugIndicator } from '@/components/layout/auth-debug-indicator'
import { topNav } from '@/components/layout/data/sidebar-data'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { RecentVisitsBar } from '@/features/recent-visits'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  showSidebarTrigger?: boolean
  showTopNav?: boolean
  showThemeSwitch?: boolean
  showProfileDropdown?: boolean
  showConfigDrawer?: boolean
  ref?: React.Ref<HTMLElement>
}

function SidebarExpandHint() {
  const { t } = useLanguage()
  const { state, toggleSidebar } = useSidebar()

  if (state !== 'collapsed') {
    return null
  }

  return (
    <button
      type='button'
      aria-label={t('sidebar.actions.expandAllMenus')}
      onClick={toggleSidebar}
      title={t('sidebar.actions.expandAllMenus')}
      className='hidden size-8 shrink-0 items-center justify-center rounded-full border border-sky-500/25 bg-sky-500/10 text-sky-600 shadow-[0_0_0_1px_hsl(var(--background))] transition-colors hover:bg-sky-500/16 hover:text-sky-700 md:inline-flex dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-300 dark:hover:bg-sky-400/16 dark:hover:text-sky-200'
    >
      <ArrowLeft
        className='sidebar-expand-hint-arrow size-4'
        strokeWidth={2.6}
      />
      <span className='sr-only'>{t('sidebar.actions.expandAllMenus')}</span>
    </button>
  )
}

export function Header({
  className,
  fixed,
  showSidebarTrigger = true,
  showTopNav = true,
  showThemeSwitch = true,
  showProfileDropdown = true,
  showConfigDrawer = false,
  children,
  style,
  ...props
}: HeaderProps) {
  const [offset, setOffset] = useState(0)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = (e: Event) => {
      const eventTarget = e.target
      const target =
        eventTarget === document
          ? document.documentElement || document.body
          : eventTarget
      if (target instanceof Element && typeof target.scrollTop === 'number') {
        setOffset(target.scrollTop)
      }
    }
    window.addEventListener('scroll', onScroll, {
      passive: true,
      capture: true,
    })
    return () =>
      window.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  return (
    <header
      className={cn(
        'z-50 h-14 flex-none transition-[background-color,border-color,shadow,backdrop-filter] duration-300 md:h-16',
        fixed &&
          'header-fixed fixed border-b border-dashed border-muted-foreground/20 bg-background/60 backdrop-blur-xl',
        offset > 5 && !fixed && 'bg-background/80 shadow-sm backdrop-blur-md',
        className
      )}
      style={
        fixed
          ? {
              ...style,
              top: 'var(--header-fixed-top, 0px)',
              left: 'var(--header-fixed-left, 0px)',
              right: 'var(--header-fixed-right, 0px)',
            }
          : style
      }
      {...props}
    >
      <div
        className={cn(
          'relative grid h-full grid-cols-[auto_minmax(0,1fr)_auto] items-center px-3 md:px-4'
        )}
      >
        {/* === 左翼 (Left Wing) === */}
        <div className='flex h-full min-w-0 items-center gap-2 md:gap-3'>
          {showSidebarTrigger && (
            <div className='flex flex-none items-center gap-1.5 md:gap-2'>
              <SidebarTrigger variant='outline' className='max-md:scale-125' />
              <SidebarExpandHint />
              <Separator orientation='vertical' className='h-6' />
            </div>
          )}

          {showTopNav && (
            <TopNav
              className='hidden flex-none xl:flex'
              links={topNav.map((link) => ({
                ...link,
                isActive:
                  pathname === link.href ||
                  (link.href !== '/' && pathname.startsWith(link.href)),
              }))}
            />
          )}

          <div className='flex h-full min-w-0 flex-1 items-center overflow-hidden'>
            {children}
          </div>
        </div>

        {/* === 中心 (Center) === */}
        <div className='flex h-full min-w-0 items-center justify-center px-2 md:px-4'>
          <RecentVisitsBar />
        </div>

        {/* === 右翼 (Right Wing) === */}
        <div className='flex h-full items-center justify-end gap-2 px-2 md:gap-4'>
          {(showThemeSwitch || showProfileDropdown || showConfigDrawer) && (
            <div className='relative z-50 flex shrink-0 items-center justify-end gap-2 md:gap-3'>
              {showThemeSwitch && <AuthDebugIndicator />}
              {showThemeSwitch && (
                <>
                  <LanguageSwitch />
                  {showProfileDropdown && <ProfileDropdown />}
                  <ThemeSwitch />
                </>
              )}
              {!showThemeSwitch && showProfileDropdown && <ProfileDropdown />}
              {showConfigDrawer && <ConfigDrawer />}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
