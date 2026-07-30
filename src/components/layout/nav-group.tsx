import { useId, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { NavBadge } from './nav-badge'
import { SidebarMenuBranch } from './sidebar-menu-branch'
import {
  checkIsActive,
  groupHasActiveItem,
  hasChildren,
  isEmptyPreservedBranch,
  isNavLink,
  isSystemAlertBadge,
} from './sidebar-nav-utils'
import type { NavGroup as NavGroupProps, NavLink } from './types'

type ManualExpansion = {
  pathname: string
  expanded: boolean
}

type NavGroupComponentProps = NavGroupProps & {
  onDesktopCategoryActivate?: (categoryId: string) => void
  selectedCategoryId?: string | null
}

export function NavGroup({
  id,
  title,
  children,
  onDesktopCategoryActivate,
  selectedCategoryId,
}: NavGroupComponentProps) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const menuId = useId()
  const [manualExpansion, setManualExpansion] =
    useState<ManualExpansion | null>(null)
  const { isMobile } = useSidebar()
  const isDesktop = !isMobile
  const shouldExpandForPath = groupHasActiveItem(pathname, children)
  const isSelectedForPreview = selectedCategoryId === id
  const routeScopedManualExpansion =
    manualExpansion?.pathname === pathname ? manualExpansion.expanded : null
  const isExpanded = routeScopedManualExpansion ?? shouldExpandForPath
  const shouldRenderMenu = !isDesktop && isExpanded

  if (children.length === 0) {
    return null
  }

  return (
    <SidebarGroup data-sidebar-nav-group={id}>
      <button
        type='button'
        aria-controls={menuId}
        aria-expanded={isDesktop ? undefined : isExpanded}
        aria-haspopup={isDesktop ? 'dialog' : undefined}
        data-sidebar-nav-group-anchor={id}
        data-sidebar-active-path={shouldExpandForPath}
        className={cn(
          'mx-auto flex w-[calc(100%-0.25rem)] origin-center transform-gpu items-center justify-between rounded-full border border-sidebar-border/45 bg-sidebar-accent/18 px-2.5 py-1.5 text-left shadow-[0_1px_2px_hsl(var(--sidebar-border)/0.18)] transition-all duration-200 motion-reduce:transform-none motion-reduce:transition-none',
          !isDesktop && isExpanded ? 'mb-1.5' : 'mb-1',
          'text-sidebar-foreground/70 hover:bg-sidebar-accent/28 hover:text-sidebar-accent-foreground',
          isSelectedForPreview &&
            'border-sky-500/45 bg-sky-500/10 text-sky-700 shadow-[0_0_0_1px_hsl(199_89%_48%/0.18)] dark:text-sky-300',
          !isDesktop &&
            isExpanded &&
            'border-sidebar-border/55 bg-sidebar-accent/40 text-sidebar-accent-foreground',
          shouldExpandForPath &&
            'relative z-10 scale-[1.015] border-orange-500/70 bg-orange-500/12 text-orange-700 shadow-[0_0_0_1px_rgb(249_115_22/0.24),0_6px_18px_rgb(249_115_22/0.10)] motion-reduce:scale-100 dark:text-orange-300'
        )}
        onClick={() => {
          if (isDesktop) {
            onDesktopCategoryActivate?.(id)
            return
          }

          setManualExpansion({
            pathname,
            expanded: !isExpanded,
          })
        }}
      >
        <SidebarGroupLabel className='mb-0 min-h-0 flex-1 px-0 py-0 text-[13px] leading-tight font-black tracking-tight whitespace-normal text-sidebar-foreground/78'>
          {title}
        </SidebarGroupLabel>
        {isDesktop ? null : (
          <ChevronRight
            className={cn(
              'size-4 shrink-0 opacity-80 transition-transform',
              isExpanded && 'rotate-90 opacity-100'
            )}
          />
        )}
      </button>
      {shouldRenderMenu ? (
        <SidebarMenu id={menuId} className='gap-px'>
          {children.map((item) => {
            if (isNavLink(item) && !hasChildren(item)) {
              return (
                <SidebarMenuLink
                  key={item.id}
                  item={item}
                  pathname={pathname}
                />
              )
            }

            if (!hasChildren(item) && !isEmptyPreservedBranch(item)) {
              return null
            }

            return (
              <SidebarMenuBranch
                key={item.id}
                item={item}
                pathname={pathname}
              />
            )
          })}
        </SidebarMenu>
      ) : null}
    </SidebarGroup>
  )
}

function SidebarMenuLink({
  item,
  pathname,
}: {
  item: NavLink
  pathname: string
}) {
  const { setOpenMobile } = useSidebar()
  const showSystemAlertBadge = isSystemAlertBadge(item)
  const isActive = checkIsActive(pathname, item)

  return (
    <SidebarMenuItem data-sidebar-node-id={item.id}>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        data-sidebar-active-path={isActive}
        data-sidebar-active-focus={isActive}
      >
        <Link
          to={item.url}
          aria-current={isActive ? 'page' : undefined}
          onClick={() => setOpenMobile(false)}
        >
          {item.icon ? <item.icon /> : null}
          <span className='px-0.5 py-0 text-[12px] leading-normal font-black'>
            {item.title}
          </span>
          {item.badge ? (
            <NavBadge danger={showSystemAlertBadge} dot={showSystemAlertBadge}>
              {item.badge}
            </NavBadge>
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
