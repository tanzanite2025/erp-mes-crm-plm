import type { ElementType } from 'react'

type SidebarBrandProps = {
    team: {
        name: string
        logo: ElementType
        plan: string
    }
}

export function SidebarBrand({ team: _team }: SidebarBrandProps) {
    return null
}
