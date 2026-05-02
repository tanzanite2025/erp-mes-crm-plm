import * as React from 'react'
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

type SidebarBrandProps = {
    team: {
        name: string
        logo: React.ElementType
        plan: string
    }
}

export function SidebarBrand({ team }: SidebarBrandProps) {
    const { state } = useSidebar()
    const isCollapsed = state === 'collapsed'
    const Logo = team.logo

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    size='default'
                    className={cn(
                        'cursor-default hover:bg-transparent active:bg-transparent',
                        isCollapsed ? 'h-10 px-0 py-0 justify-center' : 'px-2 h-auto py-2'
                    )}
                >
                    <div className={cn('flex w-full items-center gap-2', isCollapsed && 'justify-center')}>
                        <div className='flex size-8 shrink-0 items-center justify-center rounded-2xl border border-sidebar-border/45 bg-sidebar-accent/20 text-sidebar-foreground'>
                            <Logo className='size-4' />
                        </div>
                        <div className={cn('grid min-w-0 flex-1 text-start leading-tight', isCollapsed && 'hidden')}>
                            <span className='truncate font-black italic py-0 px-0.5 leading-tight text-base'>
                                {team.name}
                            </span>
                            <span className='truncate text-[10px] italic text-muted-foreground/50 font-black uppercase tracking-widest leading-none mt-0.5'>{team.plan}</span>
                        </div>
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
