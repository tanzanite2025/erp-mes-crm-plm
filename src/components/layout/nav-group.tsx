import { useState, type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { Badge } from '../ui/badge'
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
import {
  checkIsActive,
  checkIsDirectlySelected,
  groupHasActiveItem,
  hasActiveDescendant,
  hasChildren,
  isEmptyPreservedBranch,
  isNavLink,
  isSystemAlertBadge,
} from './sidebar-nav-utils'
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

export function NavGroup({
  title,
  children,
  excludeBranchId,
}: NavGroupProps & {
  excludeBranchId?: string
}) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null)
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const itemsWithBadges = children.filter((item) => item.id !== excludeBranchId)
  const shouldExpandForPath = groupHasActiveItem(pathname, itemsWithBadges)
  const isExpanded = manualExpanded ?? shouldExpandForPath
  const shouldRenderMenu = isCollapsed || isExpanded

  if (itemsWithBadges.length === 0) {
    return null
  }

  return (
    <SidebarGroup>
      {isCollapsed ? null : (
        <button
          type='button'
          className={cn(
            'flex w-full items-center justify-between rounded-full border border-sidebar-border/45 bg-sidebar-accent/18 px-2.5 py-1.5 text-left shadow-[0_1px_2px_hsl(var(--sidebar-border)/0.18)] transition-colors',
            isExpanded ? 'mb-1.5' : 'mb-1',
            'text-sidebar-foreground/70 hover:bg-sidebar-accent/28 hover:text-sidebar-accent-foreground',
            isExpanded &&
              'border-sidebar-border/55 bg-sidebar-accent/40 text-sidebar-accent-foreground'
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
          <SidebarGroupLabel className='mb-0 min-h-0 flex-1 px-0 py-0 text-[13px] leading-tight font-black tracking-tight whitespace-normal text-sidebar-foreground/78 italic'>
            {title}
          </SidebarGroupLabel>
          <ChevronRight
            className={cn(
              'size-4 shrink-0 opacity-80 transition-transform',
              isExpanded && 'rotate-90 opacity-100'
            )}
          />
        </button>
      )}
      {shouldRenderMenu ? (
        <SidebarMenu className='gap-px'>
          {itemsWithBadges.map((item) => {
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
                isCollapsed={isCollapsed}
              />
            )
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

function SidebarMenuLink({
  item,
  pathname,
}: {
  item: NavLink
  pathname: string
}) {
  const { setOpenMobile } = useSidebar()
  const showSystemAlertBadge = isSystemAlertBadge(item)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={checkIsActive(pathname, item)}
        tooltip={item.title}
      >
        <Link to={item.url} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon />}
          <span className='px-0.5 py-0 text-[12px] leading-normal font-black italic'>
            {item.title}
          </span>
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
          <SidebarMenuButton
            tooltip={item.title}
            isActive={checkIsActive(pathname, item)}
          >
            <div className='flex items-center gap-2'>
              {item.icon && <item.icon />}
              <span className='px-0.5 py-0 text-[12px] leading-normal italic'>
                {item.title}
              </span>
            </div>
            {item.badge && (
              <NavBadge
                danger={showSystemAlertBadge}
                dot={showSystemAlertBadge}
              >
                {item.badge}
              </NavBadge>
            )}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side='right'
          align='start'
          sideOffset={4}
          className={dropdownContentClassName}
        >
          <DropdownMenuLabel className={cn(dropdownLabelClassName, 'italic')}>
            {item.title} {item.badge ? `(${item.badge})` : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className='py-1'>
            {item.children.map((subItem) => {
              if (hasChildren(subItem)) {
                const nestedChildLinks = subItem.children.filter(isNavLink)

                if (
                  nestedChildLinks.length === 0 &&
                  !subItem.preserveEmptyChildren
                ) {
                  return null
                }

                return (
                  <DropdownMenuSub key={subItem.id}>
                    <DropdownMenuSubTrigger
                      className={cn(
                        dropdownSubTriggerClassName,
                        checkIsActive(pathname, subItem) &&
                          'border-border/50 bg-accent/65 text-accent-foreground'
                      )}
                    >
                      {subItem.icon && <subItem.icon />}
                      <span className='max-w-52 px-0.5 py-0.5 text-[13px] leading-normal font-black text-wrap italic'>
                        {subItem.title}
                      </span>
                      {subItem.badge ? (
                        <span className='ms-auto text-[10px] font-black italic opacity-60'>
                          {subItem.badge}
                        </span>
                      ) : null}
                    </DropdownMenuSubTrigger>
                    {nestedChildLinks.length > 0 ? (
                      <DropdownMenuSubContent
                        className={dropdownSubContentClassName}
                      >
                        {nestedChildLinks.map((nestedItem) => (
                          <DropdownMenuItem
                            key={nestedItem.id}
                            asChild
                            className={dropdownItemClassName}
                          >
                            <Link
                              to={nestedItem.url}
                              className={cn(
                                checkIsActive(pathname, nestedItem)
                                  ? 'bg-secondary'
                                  : ''
                              )}
                            >
                              {nestedItem.icon && <nestedItem.icon />}
                              <span className='max-w-52 px-0.5 py-0.5 text-[12px] leading-normal font-black text-wrap italic'>
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
                    ) : null}
                  </DropdownMenuSub>
                )
              }

              if (!isNavLink(subItem)) {
                return null
              }

              return (
                <DropdownMenuItem
                  key={subItem.id}
                  asChild
                  className={dropdownItemClassName}
                >
                  <Link
                    to={subItem.url}
                    className={cn(
                      checkIsActive(pathname, subItem) ? 'bg-secondary' : ''
                    )}
                  >
                    {subItem.icon && <subItem.icon />}
                    <span className='max-w-52 px-0.5 py-0.5 text-[13px] leading-normal font-black text-wrap italic'>
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

export function SidebarMenuBranch({
  item,
  pathname,
  isCollapsed,
}: {
  item: NavItem & { children: NavItem[] }
  pathname: string
  isCollapsed: boolean
}) {
  if (isCollapsed) {
    return <SidebarMenuCollapsedDropdown item={item} pathname={pathname} />
  }

  const childLinks = item.children.filter(isNavLink)
  const shouldRenderEmptyBranch =
    childLinks.length === 0 && item.preserveEmptyChildren
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
              <span className='px-0.5 py-0 text-[12px] leading-normal font-black tracking-tight italic'>
                {item.title}
              </span>
            </div>
            {item.badge && (
              <NavBadge
                danger={showSystemAlertBadge}
                dot={showSystemAlertBadge}
              >
                {item.badge}
              </NavBadge>
            )}
            <div className='ms-auto flex size-4 items-center justify-center'>
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
            <span className='px-0.5 py-0 text-[12px] leading-normal font-black tracking-tight italic'>
              {item.title}
            </span>
          </div>
          {item.badge && (
            <NavBadge danger={showSystemAlertBadge} dot={showSystemAlertBadge}>
              {item.badge}
            </NavBadge>
          )}
          <div className='ms-auto flex size-4 items-center justify-center'>
            <div className={branchIndicatorClassName} />
          </div>
        </SidebarMenuButton>
      )}
      {childLinks.length > 0 ? (
        <SidebarMenuSub>
          {childLinks.map((subItem) => {
            const subItemIsActive = checkIsActive(pathname, subItem)

            return (
              <SidebarMenuSubItem
                key={subItem.id}
                className='before:absolute before:top-1/2 before:-left-3 before:h-px before:w-3 before:bg-sidebar-border/35 before:content-[""]'
              >
                <SidebarMenuSubButton asChild isActive={subItemIsActive}>
                  <Link to={subItem.url}>
                    {subItem.icon && <subItem.icon />}
                    <span className='min-w-0 flex-1 truncate text-[12px] font-black tracking-tight italic'>
                      {subItem.title}
                    </span>
                    {subItem.badge ? (
                      <span className='ms-auto shrink-0 text-[10px] font-black italic opacity-60'>
                        {subItem.badge}
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center',
                        !subItem.badge && 'ms-auto'
                      )}
                    >
                      {subItemIsActive ? (
                        <span className='size-1.5 animate-pulse rounded-full bg-orange-500 ring-2 ring-orange-500/25' />
                      ) : null}
                    </div>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      ) : shouldRenderEmptyBranch ? (
        <SidebarMenuSub />
      ) : null}
    </SidebarMenuItem>
  )
}
