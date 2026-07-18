import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
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
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { NavBadge } from './nav-badge'
import {
  checkIsActive,
  hasChildren,
  isNavLink,
  isSystemAlertBadge,
} from './sidebar-nav-utils'
import type { NavBranch } from './types'

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

type SidebarMenuCollapsedDropdownProps = {
  item: NavBranch
  pathname: string
}

export function SidebarMenuCollapsedDropdown({
  item,
  pathname,
}: SidebarMenuCollapsedDropdownProps) {
  const { setOpenMobile } = useSidebar()
  const showSystemAlertBadge = isSystemAlertBadge(item)

  return (
    <SidebarMenuItem data-sidebar-node-id={item.id}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={checkIsActive(pathname, item)}
          >
            <div className='flex items-center gap-2'>
              {item.icon ? <item.icon /> : null}
              <span className='px-0.5 py-0 text-[12px] leading-normal italic'>
                {item.title}
              </span>
            </div>
            {item.badge ? (
              <NavBadge
                danger={showSystemAlertBadge}
                dot={showSystemAlertBadge}
              >
                {item.badge}
              </NavBadge>
            ) : null}
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
                      {subItem.icon ? <subItem.icon /> : null}
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
                        {nestedChildLinks.map((nestedItem) => {
                          const nestedItemIsActive = checkIsActive(
                            pathname,
                            nestedItem
                          )

                          return (
                            <DropdownMenuItem
                              key={nestedItem.id}
                              asChild
                              className={dropdownItemClassName}
                            >
                              <Link
                                to={nestedItem.url}
                                aria-current={
                                  nestedItemIsActive ? 'page' : undefined
                                }
                                className={cn(
                                  nestedItemIsActive ? 'bg-secondary' : ''
                                )}
                                onClick={() => setOpenMobile(false)}
                              >
                                {nestedItem.icon ? <nestedItem.icon /> : null}
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
                          )
                        })}
                      </DropdownMenuSubContent>
                    ) : null}
                  </DropdownMenuSub>
                )
              }

              if (!isNavLink(subItem)) {
                return null
              }

              const subItemIsActive = checkIsActive(pathname, subItem)

              return (
                <DropdownMenuItem
                  key={subItem.id}
                  asChild
                  className={dropdownItemClassName}
                >
                  <Link
                    to={subItem.url}
                    aria-current={subItemIsActive ? 'page' : undefined}
                    className={cn(subItemIsActive ? 'bg-secondary' : '')}
                    onClick={() => setOpenMobile(false)}
                  >
                    {subItem.icon ? <subItem.icon /> : null}
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
