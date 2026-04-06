import { type ReactNode } from 'react'
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
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Badge } from '../ui/badge'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import type {
  NavCollapsible,
  NavGroup as NavGroupProps,
  NavItem,
  NavLink,
} from './types'

function isSystemManagementItem(item: NavItem) {
  return 'url' in item && item.url === '/system-management/routing'
}

function isApprovalCenterItem(item: NavItem) {
  return 'url' in item && item.url === '/approval'
}

function withDynamicBadges(items: NavItem[], unreadApprovals: number, systemAlertCount: number): NavItem[] {
  return items.map((item) => {
    if (isApprovalCenterItem(item) && unreadApprovals > 0) {
      return { ...item, badge: unreadApprovals.toString() }
    }
    if (isSystemManagementItem(item) && systemAlertCount > 0) {
      return { ...item, badge: '●' }
    }
    return item
  })
}

export function NavGroup({ title, items }: NavGroupProps) {
  const { unreadApprovals } = useNotificationStore()
  const pathname = useLocation({ select: (location) => location.pathname })

  const shouldWatchSystemAlerts = items.some((item) => isSystemManagementItem(item))
  const { data: systemActiveAlerts = [] } = useQuery({
    queryKey: ['sidebar-system-active-alerts'],
    queryFn: () => apiFetch<any[]>('/system/status/alerts/active'),
    refetchInterval: (query) => {
      const error = query.state.error as { status?: number } | null
      return error?.status === 403 ? false : 10000
    },
    staleTime: 5000,
    retry: false,
    enabled: shouldWatchSystemAlerts,
  })

  const systemAlertCount = systemActiveAlerts.length
  const itemsWithBadges = withDynamicBadges(items, unreadApprovals, systemAlertCount)

  return (
    <SidebarGroup>
      <SidebarGroupLabel className='mb-1.5 h-auto min-h-5 py-0 leading-[1.2] whitespace-normal font-black italic'>
        {title}
      </SidebarGroupLabel>
      <SidebarMenu className='gap-px'>
        {itemsWithBadges.map((item) => {
          const key = `${item.title}-${'url' in item ? item.url : item.title}`

          if (!item.items) {
            return <SidebarMenuLink key={key} item={item} pathname={pathname} />
          }

          return <SidebarMenuCollapsedDropdown key={key} item={item} pathname={pathname} />
        })}
      </SidebarMenu>
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
  const isSystemAlertBadge = item.url === '/system-management/routing' && item.badge === '●'

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={checkIsActive(pathname, item)} tooltip={item.title}>
        <Link to={item.url} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon />}
          <span className='px-0.5 py-0 italic font-black leading-normal'>{item.title}</span>
          {item.badge && (
            <NavBadge danger={isSystemAlertBadge} dot={isSystemAlertBadge}>
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
  item: NavCollapsible
  pathname: string
}) {
  const isSystemAlertBadge = item.url === '/system-management/routing' && item.badge === '●'

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={checkIsActive(pathname, item)}>
            <div className='flex items-center gap-2'>
              {item.icon && <item.icon />}
              <span className='px-0.5 py-0 italic leading-normal'>{item.title}</span>
            </div>
            {item.badge && (
              <NavBadge danger={isSystemAlertBadge} dot={isSystemAlertBadge}>
                {item.badge}
              </NavBadge>
            )}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='right' align='start' sideOffset={4}>
          <DropdownMenuLabel className='italic'>
            {item.title} {item.badge ? `(${item.badge})` : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className='py-1'>
            {item.items.map((subItem) => (
              <DropdownMenuItem key={`${subItem.title}-${subItem.url}`} asChild>
                <Link
                  to={subItem.url}
                  className={cn(checkIsActive(pathname, subItem) ? 'bg-secondary' : '')}
                >
                  {subItem.icon && <subItem.icon />}
                  <span className='max-w-52 px-0.5 py-0.5 text-wrap italic font-black leading-normal'>
                    {subItem.title}
                  </span>
                  {subItem.badge && (
                    <span className='ms-auto text-[10px] font-black italic opacity-60'>
                      {subItem.badge}
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function checkIsActive(pathname: string, item: NavItem, mainNav = false) {
  if ((item as any).url === '/') {
    return pathname === '/'
  }

  return (
    pathname === (item as any).url ||
    pathname.startsWith((item as any).url + '/') ||
    !!item?.items?.some((subItem) => pathname === subItem.url || pathname.startsWith(subItem.url + '/')) ||
    (mainNav && pathname.split('/')[1] === (item as any)?.url?.split('/')[1])
  )
}
