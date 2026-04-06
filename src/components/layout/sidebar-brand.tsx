import * as React from 'react'
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar'

type SidebarBrandProps = {
    team: {
        name: string
        logo: React.ElementType
        plan: string
    }
}

export function SidebarBrand({ team }: SidebarBrandProps) {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    size='default'
                    className='cursor-default hover:bg-transparent active:bg-transparent px-2 h-auto py-2'
                >
                    <div className='grid flex-1 text-start leading-tight'>
                        <span className='truncate font-black italic py-0 px-0.5 leading-tight text-base'>
                            {team.name}
                        </span>
                        <span className='truncate text-[10px] italic text-muted-foreground/50 font-black uppercase tracking-widest leading-none mt-0.5'>{team.plan}</span>
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
