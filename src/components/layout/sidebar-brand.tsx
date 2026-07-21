import type { ElementType } from 'react'

type SidebarBrandProps = {
  team: {
    name: string
    logo: ElementType
    plan: string
    logoUrl?: string
  }
}

export function SidebarBrand({ team }: SidebarBrandProps) {
  const Logo = team.logo
  const logoAlt = team.name ? `${team.name} logo` : 'Enterprise logo'

  return (
    <div className='group/brand relative mx-1 my-2 flex min-h-[64px] items-center justify-center p-2 transition-all duration-300 group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:w-14 group-data-[collapsible=icon]:p-0'>
      <div className='flex h-[48px] w-full items-center gap-3 rounded-xl border border-sidebar-border/40 bg-sidebar-accent/18 px-2.5 shadow-sm transition-all duration-300 group-data-[collapsible=icon]:size-12 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-1.5'>
        <div className='flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background/80 ring-1 ring-sidebar-border/50'>
          {team.logoUrl ? (
            <img
              src={team.logoUrl}
              alt={logoAlt}
              className='size-full object-contain p-1'
              loading='eager'
              decoding='async'
            />
          ) : (
            <Logo className='size-5 text-sidebar-foreground/80' />
          )}
        </div>

        <div className='flex min-w-0 flex-1 flex-col justify-center group-data-[collapsible=icon]:hidden'>
          <div className='truncate text-[15px] leading-none font-black text-sidebar-foreground'>
            {team.name}
          </div>
          <div className='mt-1.5 truncate text-[11px] leading-none font-semibold text-sidebar-foreground/60'>
            {team.plan}
          </div>
        </div>
      </div>
    </div>
  )
}
