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
    <div className='group/brand relative mx-1 my-2 flex min-h-[122px] flex-col items-center justify-center gap-2 p-2 transition-all duration-300 group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:min-h-14 group-data-[collapsible=icon]:w-14 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0'>
      <div className='flex h-16 w-full shrink-0 items-center justify-center transition-all duration-300 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12'>
        {team.logoUrl ? (
          <img
            src={team.logoUrl}
            alt={logoAlt}
            className='h-16 w-auto max-w-[8.5rem] object-contain transition-all duration-300 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:max-w-9'
            loading='eager'
            decoding='async'
          />
        ) : (
          <Logo className='size-11 text-sidebar-foreground/80 transition-all duration-300 group-data-[collapsible=icon]:size-7' />
        )}
      </div>

      <div className='flex h-[48px] w-full min-w-0 flex-col items-center justify-center text-center group-data-[collapsible=icon]:hidden'>
        <div className='min-h-[15px] max-w-full truncate text-[15px] leading-none font-black text-sidebar-foreground'>
          {team.name}
        </div>
        <div className='mt-1.5 min-h-[11px] max-w-full truncate text-[11px] leading-none font-semibold text-sidebar-foreground/60'>
          {team.plan}
        </div>
      </div>
    </div>
  )
}
