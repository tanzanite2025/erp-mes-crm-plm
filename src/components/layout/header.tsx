import { useEffect, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { TopNav } from '@/components/layout/top-nav'
import { topNav } from '@/components/layout/data/sidebar-data'
import { Search } from '@/components/search'
import { LanguageSwitch } from '@/components/language-switch'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { AuthDebugIndicator } from '@/components/layout/auth-debug-indicator'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  showSidebarTrigger?: boolean
  showTopNav?: boolean
  showGlobalSearch?: boolean
  showThemeSwitch?: boolean
  showProfileDropdown?: boolean
  showConfigDrawer?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Header({
  className,
  fixed,
  showSidebarTrigger = true,
  showTopNav = true,
  showGlobalSearch = true,
  showThemeSwitch = true,
  showProfileDropdown = true,
  showConfigDrawer = false,
  children,
  ...props
}: HeaderProps) {
  const [offset, setOffset] = useState(0)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = (e: Event) => {
      const eventTarget = e.target
      const target = eventTarget === document ? (document.documentElement || document.body) : eventTarget
      if (target instanceof Element && typeof target.scrollTop === 'number') {
        setOffset(target.scrollTop)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => window.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  return (
    <header
      className={cn(
        'z-50 h-14 md:h-16 flex-none transition-[background-color,border-color,shadow,backdrop-filter] duration-300',
        fixed && 'header-fixed fixed top-0 right-0 left-0 md:left-[var(--header-fixed-left,var(--sidebar-width))] bg-background/60 backdrop-blur-xl border-b border-dashed border-muted-foreground/20',
        offset > 5 && !fixed && 'shadow-sm bg-background/80 backdrop-blur-md',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'relative grid grid-cols-[auto_minmax(0,1fr)_auto] h-full items-center px-3 md:px-4'
        )}
      >
        {/* === 左翼 (Left Wing) === */}
        <div className='flex items-center gap-2 md:gap-4 min-w-0 h-full'>
          {showSidebarTrigger && (
            <div className='flex items-center gap-2 flex-none'>
              <SidebarTrigger variant='outline' className='max-md:scale-125' />
              <Separator orientation='vertical' className='h-6' />
            </div>
          )}

          {showTopNav && (
            <TopNav className='hidden xl:flex flex-none' links={topNav.map(link => ({
              ...link,
              isActive: pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
            }))} />
          )}

          <div className='flex h-full min-w-0 flex-1 items-center overflow-hidden'>
            {children}
          </div>
        </div>

        {/* === 中心 (Center) === */}
        <div className='flex justify-center items-center px-4 h-full min-w-0'>
            {showGlobalSearch && (
            <div className='hidden md:block w-full max-w-[28rem]'>
                <Search className='sm:w-full lg:w-full xl:w-full max-w-[28rem]' />
            </div>
            )}
        </div>

        {/* === 右翼 (Right Wing) === */}
        <div className='flex items-center justify-end gap-2 md:gap-4 h-full px-2'>
            {(showGlobalSearch || showThemeSwitch || showProfileDropdown || showConfigDrawer) && (
            <div className='flex items-center justify-end gap-2 md:gap-4 shrink-0 relative z-50'>
                <div className='md:hidden flex items-center'>
                    {showGlobalSearch && <Search className='sm:w-9' />}
                </div>

                {showThemeSwitch && (
                    <div className='flex items-center gap-2 md:gap-3 p-1 rounded-md'>
                        <AuthDebugIndicator />
                        <div className='h-4 w-px bg-border' />
                        <LanguageSwitch />
                        {showProfileDropdown && <ProfileDropdown />}
                        <ThemeSwitch />
                    </div>
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
