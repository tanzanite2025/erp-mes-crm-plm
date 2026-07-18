import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { NavBadge } from './nav-badge'
import {
  checkIsActive,
  checkIsDirectlySelected,
  hasActiveDescendant,
  isNavLink,
  isSystemAlertBadge,
} from './sidebar-nav-utils'
import type { NavBranch } from './types'

const branchButtonClassName =
  'mx-auto min-h-8 w-[calc(100%-1rem)] origin-center transform-gpu rounded-xl border border-transparent px-2.5 py-1 transition-all duration-200 hover:bg-sidebar-accent/28 data-[active=true]:bg-sidebar-accent/45 data-[active=true]:text-sidebar-accent-foreground motion-reduce:transform-none motion-reduce:transition-none'

type SidebarMenuBranchProps = {
  item: NavBranch
  pathname: string
}

export function SidebarMenuBranch({ item, pathname }: SidebarMenuBranchProps) {
  const { setOpenMobile } = useSidebar()
  const childLinks = item.children.filter(isNavLink)
  const shouldRenderEmptyBranch =
    childLinks.length === 0 && item.preserveEmptyChildren
  const showSystemAlertBadge = isSystemAlertBadge(item)
  const branchIsActive = checkIsActive(pathname, item)
  const branchIsDirectlySelected = checkIsDirectlySelected(pathname, item)
  const branchHasActiveDescendant = hasActiveDescendant(pathname, item)
  const activeBranchClassName =
    branchIsActive &&
    'relative z-10 scale-[1.02] border-orange-500/20 shadow-sm motion-reduce:scale-100'
  const branchIndicatorClassName = cn(
    'size-1.5 rounded-full ring-2 ring-transparent transition-all',
    branchIsDirectlySelected
      ? 'bg-primary ring-primary/20 animate-pulse'
      : branchHasActiveDescendant
        ? 'bg-primary/70 ring-primary/10'
        : 'bg-muted-foreground/30'
  )
  const branchContents = (
    <>
      <div className='flex min-w-0 items-center gap-2.5'>
        {item.icon ? <item.icon className='size-3.5 opacity-70' /> : null}
        <span className='px-0.5 py-0 text-[12px] leading-normal font-black tracking-tight italic'>
          {item.title}
        </span>
      </div>
      {item.badge ? (
        <NavBadge danger={showSystemAlertBadge} dot={showSystemAlertBadge}>
          {item.badge}
        </NavBadge>
      ) : null}
      <div className='ms-auto flex size-4 items-center justify-center'>
        <div className={branchIndicatorClassName} />
      </div>
    </>
  )

  return (
    <SidebarMenuItem data-sidebar-node-id={item.id}>
      {item.url ? (
        <SidebarMenuButton
          asChild
          isActive={branchIsActive}
          tooltip={item.title}
          className={cn(branchButtonClassName, activeBranchClassName)}
          data-sidebar-active-path={branchIsActive}
        >
          <Link
            to={item.url}
            aria-current={branchIsDirectlySelected ? 'page' : undefined}
            onClick={() => setOpenMobile(false)}
          >
            {branchContents}
          </Link>
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton
          asChild
          isActive={branchIsActive}
          tooltip={item.title}
          className={cn(branchButtonClassName, activeBranchClassName)}
          data-sidebar-active-path={branchIsActive}
        >
          <div>{branchContents}</div>
        </SidebarMenuButton>
      )}
      {childLinks.length > 0 ? (
        <SidebarMenuSub>
          {childLinks.map((subItem) => {
            const subItemIsActive = checkIsActive(pathname, subItem)

            return (
              <SidebarMenuSubItem
                key={subItem.id}
                data-sidebar-node-id={subItem.id}
                className='before:absolute before:top-1/2 before:-left-3 before:h-px before:w-3 before:bg-sidebar-border/35 before:content-[""]'
              >
                <SidebarMenuSubButton
                  asChild
                  isActive={subItemIsActive}
                  data-sidebar-active-path={subItemIsActive}
                >
                  <Link
                    to={subItem.url}
                    aria-current={subItemIsActive ? 'page' : undefined}
                    onClick={() => setOpenMobile(false)}
                  >
                    {subItem.icon ? <subItem.icon /> : null}
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
