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

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    size='default'
                    className={cn(
                        'cursor-default hover:bg-transparent active:bg-transparent',
                        isCollapsed ? 'hidden' : 'px-2 h-auto py-2'
                    )}
                >
                    <div className='grid min-w-0 w-full text-start leading-tight'>
                        <span className='truncate px-0.5 py-0 font-black italic leading-tight text-base'>
                            {team.name}
                        </span>
                        <span className='mt-0.5 truncate text-[10px] font-black uppercase italic tracking-widest leading-none text-muted-foreground/50'>
                            {team.plan}
                        </span>
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
