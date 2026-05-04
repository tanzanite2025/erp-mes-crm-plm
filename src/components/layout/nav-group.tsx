import { useState, type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { useNotificationStore } from '@/stores/notification-store'
import { apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Badge } from '../ui/badge'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import type {
  NavBranch,
  NavGroup as NavGroupProps,
  NavItem,
  NavLink,
} from './types'

const branchButtonClassName =
  'ms-3 w-[calc(100%-0.75rem)] min-h-8 rounded-xl border border-transparent px-2.5 py-1 transition-all hover:bg-sidebar-accent/28 data-[active=true]:bg-sidebar-accent/45 data-[active=true]:text-sidebar-accent-foreground'

const dropdownContentClassName =
  'rounded-[24px] border-dashed border-border/55 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-sm'

const dropdownLabelClassName =
  'px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-muted-foreground/70'

const dropdownItemClassName =
  'rounded-xl border border-dashed border-transparent px-2.5 py-2 text-[13px] font-black italic tracking-tight focus:border-border/50 focus:bg-accent/60'

const dropdownSubTriggerClassName =
  'rounded-xl border border-dashed border-transparent px-2.5 py-2 text-[13px] font-black italic tracking-tight focus:border-border/50 focus:bg-accent/60 data-[state=open]:border-border/50 data-[state=open]:bg-accent/70'

const dropdownSubContentClassName =
  'rounded-[20px] border-dashed border-border/55 bg-popover/96 p-1.5 shadow-xl backdrop-blur-sm'

function resolveBadgeValue(item: NavItem, unreadApprovals: number, systemAlertCount: number): string | undefined {
  if (item.badgeKey === 'approval-unread' || item.id === 'approval-center') {
    return unreadApprovals > 0 ? unreadApprovals.toString() : undefined
  }

  if (item.badgeKey === 'system-alert' || item.id === 'system-management') {
    return systemAlertCount > 0 ? '●' : undefined
  }

  return item.badge
}

function withDynamicBadges(items: NavItem[], unreadApprovals: number, systemAlertCount: number): NavItem[] {
  return items.map((item) => {
    const resolvedBadge = resolveBadgeValue(item, unreadApprovals, systemAlertCount)

    return {
      ...item,
      badge: resolvedBadge,
      children: item.children?.map((child) => withDynamicBadges([child], unreadApprovals, systemAlertCount)[0]),
    }
  })
}

function normalizePath(path?: string): string {
  if (!path) {
    return ''
  }

  const normalized = path
    .split('?')[0]
    ?.split('#')[0]
    ?.replace(/\/+/g, '/')
    .replace(/\/$/, '')

  return normalized || '/'
}

function isPathMatch(pathname: string, target?: string): boolean {
  if (!target) {
    return false
  }

  if (target === '/') {
    return pathname === '/'
  }

  return pathname === target || pathname.startsWith(target + '/')
}

function isExactPathMatch(pathname: string, target?: string): boolean {
  if (!target) {
    return false
  }

  return normalizePath(pathname) === normalizePath(target)
}

function checkIsActive(pathname: string, item: NavItem, mainNav = false): boolean {
  const itemUrl = item.url ? String(item.url) : undefined
  const activeTarget = item.activeMatch ? String(item.activeMatch) : itemUrl
  const selfActive = isPathMatch(pathname, activeTarget)
  const childActive = !!item.children?.some((child) => checkIsActive(pathname, child))

  if (selfActive || childActive) {
    return true
  }

  return !!(itemUrl && mainNav && pathname.split('/')[1] === itemUrl.split('/')[1])
}

function checkIsDirectlySelected(pathname: string, item: NavItem): boolean {
  const itemUrl = item.url ? String(item.url) : undefined
  const activeTarget = item.activeMatch ? String(item.activeMatch) : itemUrl
  return isExactPathMatch(pathname, activeTarget)
}

function hasActiveDescendant(pathname: string, item: NavItem): boolean {
  return !!item.children?.some((child) => checkIsActive(pathname, child))
}

function groupHasActiveItem(pathname: string, items: NavItem[]) {
  return items.some((item) => checkIsActive(pathname, item))
}

function hasChildren(item: NavItem): item is NavBranch {
  return Array.isArray(item.children) && item.children.length > 0
}

function isSystemAlertBadge(item: NavItem) {
  return (item.badgeKey === 'system-alert' || item.id === 'system-management') && item.badge === '●'
}

function hasSystemAlertConsumer(items: NavItem[]): boolean {
  return items.some(
    (item) =>
      item.badgeKey === 'system-alert' ||
      item.id === 'system-management' ||
      (!!item.children?.length && hasSystemAlertConsumer(item.children))
  )
}

type SidebarSystemAlert = {
  id?: string
}

export function NavGroup({ title, children }: NavGroupProps) {
  const { unreadApprovals } = useNotificationStore()
  const pathname = useLocation({ select: (location) => location.pathname })
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null)
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  const shouldWatchSystemAlerts = hasSystemAlertConsumer(children)
  const { data: systemActiveAlerts = [] } = useQuery({
    queryKey: ['sidebar-system-active-alerts'],
    queryFn: () => apiFetch<SidebarSystemAlert[]>('/system/status/alerts/active'),
    refetchInterval: (query) => {
      const error = query.state.error as { status?: number } | null
      return error?.status === 403 ? false : 10000
    },
    staleTime: 5000,
    retry: false,
    enabled: shouldWatchSystemAlerts,
  })

  const systemAlertCount = systemActiveAlerts.length
  const itemsWithBadges = withDynamicBadges(children, unreadApprovals, systemAlertCount)
  const shouldExpandForPath = groupHasActiveItem(pathname, itemsWithBadges)
  const isExpanded = manualExpanded ?? shouldExpandForPath
  const shouldRenderMenu = isCollapsed || isExpanded

  return (
    <SidebarGroup>
      {isCollapsed ? null : (
        <button
          type='button'
          className={cn(
            'flex w-full items-center justify-between rounded-full border border-sidebar-border/45 bg-sidebar-accent/18 px-2.5 py-1.5 text-left shadow-[0_1px_2px_hsl(var(--sidebar-border)/0.18)] transition-colors',
            isExpanded ? 'mb-1.5' : 'mb-1',
            'text-sidebar-foreground/70 hover:bg-sidebar-accent/28 hover:text-sidebar-accent-foreground',
            isExpanded && 'border-sidebar-border/55 bg-sidebar-accent/40 text-sidebar-accent-foreground'
          )}
          onClick={() => {
            setManualExpanded((current) => {
              if (current === null) {
                return !shouldExpandForPath
              }

              return !current
            })
          }}
        >
          <SidebarGroupLabel className='mb-0 min-h-0 flex-1 px-0 py-0 text-[13px] leading-tight whitespace-normal font-black italic tracking-tight text-sidebar-foreground/78'>
            {title}
          </SidebarGroupLabel>
          <ChevronRight className={cn('size-4 shrink-0 transition-transform opacity-80', isExpanded && 'rotate-90 opacity-100')} />
        </button>
      )}
      {shouldRenderMenu ? (
        <SidebarMenu className='gap-px'>
          {itemsWithBadges.map((item) => {
            if (isNavLink(item) && !hasChildren(item)) {
              return <SidebarMenuLink key={item.id} item={item} pathname={pathname} />
            }

            if (!hasChildren(item)) {
              return null
            }

            return <SidebarMenuBranch key={item.id} item={item} pathname={pathname} isCollapsed={isCollapsed} />
          })}
        </SidebarMenu>
      ) : null}
    </SidebarGroup>
  )
}

function NavBadge({
  children,
  danger = false,
  dot = false,
}: {
  children: ReactNode
  danger?: boolean
  dot?: boolean
}) {
  return (
    <Badge
      className={cn(
        'flex h-4 min-w-4 items-center justify-center rounded-full px-1 py-0 text-[10px] font-black',
        danger && 'bg-rose-500 text-white',
        dot && 'min-w-4 text-[8px]'
      )}
    >
      {children}
    </Badge>
  )
}

function SidebarMenuLink({ item, pathname }: { item: NavLink; pathname: string }) {
  const { setOpenMobile } = useSidebar()
  const showSystemAlertBadge = isSystemAlertBadge(item)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={checkIsActive(pathname, item)} tooltip={item.title}>
        <Link to={item.url} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon />}
          <span className='px-0.5 py-0 text-[12px] italic font-black leading-normal'>{item.title}</span>
          {item.badge && (
            <NavBadge danger={showSystemAlertBadge} dot={showSystemAlertBadge}>
              {item.badge}
            </NavBadge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarMenuCollapsedDropdown({
  item,
  pathname,
}: {
  item: NavBranch
  pathname: string
}) {
  const showSystemAlertBadge = isSystemAlertBadge(item)

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={checkIsActive(pathname, item)}>
            <div className='flex items-center gap-2'>
              {item.icon && <item.icon />}
              <span className='px-0.5 py-0 text-[12px] italic leading-normal'>{item.title}</span>
            </div>
            {item.badge && (
              <NavBadge danger={showSystemAlertBadge} dot={showSystemAlertBadge}>
                {item.badge}
              </NavBadge>
            )}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='right' align='start' sideOffset={4} className={dropdownContentClassName}>
          <DropdownMenuLabel className={cn(dropdownLabelClassName, 'italic')}>
            {item.title} {item.badge ? `(${item.badge})` : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className='py-1'>
            {item.children.map((subItem) => {
              if (hasChildren(subItem)) {
                const nestedChildLinks = subItem.children.filter(isNavLink)

                if (nestedChildLinks.length === 0) {
                  return null
                }

                return (
                  <DropdownMenuSub key={subItem.id}>
                    <DropdownMenuSubTrigger
                      className={cn(
                        dropdownSubTriggerClassName,
                        checkIsActive(pathname, subItem) && 'border-border/50 bg-accent/65 text-accent-foreground'
                      )}
                    >
                      {subItem.icon && <subItem.icon />}
                      <span className='max-w-52 px-0.5 py-0.5 text-[13px] text-wrap italic font-black leading-normal'>
                        {subItem.title}
                      </span>
                      {subItem.badge ? (
                        <span className='ms-auto text-[10px] font-black italic opacity-60'>
                          {subItem.badge}
                        </span>
                      ) : null}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className={dropdownSubContentClassName}>
                      {nestedChildLinks.map((nestedItem) => (
                        <DropdownMenuItem key={nestedItem.id} asChild className={dropdownItemClassName}>
                          <Link
                            to={nestedItem.url}
                            className={cn(checkIsActive(pathname, nestedItem) ? 'bg-secondary' : '')}
                          >
                            {nestedItem.icon && <nestedItem.icon />}
                            <span className='max-w-52 px-0.5 py-0.5 text-[12px] text-wrap italic font-black leading-normal'>
                              {nestedItem.title}
                            </span>
                            {nestedItem.badge ? (
                              <span className='ms-auto text-[10px] font-black italic opacity-60'>
                                {nestedItem.badge}
                              </span>
                            ) : null}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )
              }

              if (!isNavLink(subItem)) {
                return null
              }

              return (
                <DropdownMenuItem key={subItem.id} asChild className={dropdownItemClassName}>
                  <Link
                    to={subItem.url}
                    className={cn(checkIsActive(pathname, subItem) ? 'bg-secondary' : '')}
                  >
                    {subItem.icon && <subItem.icon />}
                    <span className='max-w-52 px-0.5 py-0.5 text-[13px] text-wrap italic font-black leading-normal'>
                      {subItem.title}
                    </span>
                    {subItem.badge ? (
                      <span className='ms-auto text-[10px] font-black italic opacity-60'>
                        {subItem.badge}
                      </span>
                    ) : null}
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function SidebarMenuBranch({
  item,
  pathname,
  isCollapsed,
}: {
  item: NavBranch
  pathname: string
  isCollapsed: boolean
}) {
  if (isCollapsed) {
    return <SidebarMenuCollapsedDropdown item={item} pathname={pathname} />
  }

  const childLinks = item.children.filter(isNavLink)
  const showSystemAlertBadge = isSystemAlertBadge(item)
  const branchIsActive = checkIsActive(pathname, item)
  const branchIsDirectlySelected = checkIsDirectlySelected(pathname, item)
  const branchHasActiveDescendant = hasActiveDescendant(pathname, item)
  const branchIndicatorClassName = cn(
    'size-1.5 rounded-full ring-2 ring-transparent transition-all',
    branchIsDirectlySelected
      ? 'bg-primary animate-pulse ring-primary/20'
      : branchHasActiveDescendant
        ? 'bg-primary/70 ring-primary/10'
        : 'bg-muted-foreground/30'
  )

  return (
    <SidebarMenuItem>
      {item.url ? (
        <SidebarMenuButton
          asChild
          isActive={branchIsActive}
          tooltip={item.title}
          className={branchButtonClassName}
        >
          <Link to={item.url}>
            <div className='flex min-w-0 items-center gap-2.5'>
              {item.icon ? <item.icon className='size-3.5 opacity-70' /> : null}
              <span className='px-0.5 py-0 text-[12px] leading-normal font-black italic tracking-tight'>
                {item.title}
              </span>
            </div>
            {item.badge && (
              <NavBadge danger={showSystemAlertBadge} dot={showSystemAlertBadge}>
                {item.badge}
              </NavBadge>
            )}
            <div className='ms-auto size-4 flex items-center justify-center'>
              <div className={branchIndicatorClassName} />
            </div>
          </Link>
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton
          isActive={branchIsActive}
          tooltip={item.title}
          className={branchButtonClassName}
        >
          <div className='flex min-w-0 items-center gap-2.5'>
            {item.icon ? <item.icon className='size-3.5 opacity-70' /> : null}
            <span className='px-0.5 py-0 text-[12px] leading-normal font-black italic tracking-tight'>
              {item.title}
            </span>
          </div>
          {item.badge && (
            <NavBadge danger={showSystemAlertBadge} dot={showSystemAlertBadge}>
              {item.badge}
            </NavBadge>
          )}
          <div className='ms-auto size-4 flex items-center justify-center'>
            <div className={branchIndicatorClassName} />
          </div>
        </SidebarMenuButton>
      )}
      {childLinks.length > 0 ? (
        <SidebarMenuSub>
          {childLinks.map((subItem) => {
            const subItemIsActive = checkIsActive(pathname, subItem)

            return (
              <SidebarMenuSubItem key={subItem.id} className='before:absolute before:-left-3 before:top-1/2 before:h-px before:w-3 before:bg-sidebar-border/35 before:content-[""]'>
                <SidebarMenuSubButton asChild isActive={subItemIsActive}>
                  <Link to={subItem.url}>
                    {subItem.icon && <subItem.icon />}
                    <span className='min-w-0 flex-1 truncate italic font-black text-[12px] tracking-tight'>
                      {subItem.title}
                    </span>
                    {subItem.badge ? (
                      <span className='ms-auto shrink-0 text-[10px] font-black italic opacity-60'>
                        {subItem.badge}
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        'size-4 shrink-0 flex items-center justify-center',
                        !subItem.badge && 'ms-auto'
                      )}
                    >
                      {subItemIsActive ? (
                        <span className='size-1.5 rounded-full bg-orange-500 animate-pulse ring-2 ring-orange-500/25' />
                      ) : null}
                    </div>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  )
}

function isNavLink(item: NavItem): item is NavLink {
  return typeof item.url !== 'undefined'
}
