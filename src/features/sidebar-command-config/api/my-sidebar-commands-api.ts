import { apiFetch } from '@/lib/api-client'
import type { SidebarCommandDefinitionDto } from './shared'

// /quick-actions/sidebar/me contract:
// business shortcuts are full command definitions only. Do not reintroduce
// businessCommandIds or string-ID fallback logic; this system has no legacy
// sidebar contract to support before launch.
export type MySidebarCommandsDto = {
  businessCommands: SidebarCommandDefinitionDto[]
  privateCommandIds: string[]
}

export function fetchMySidebarCommands() {
  return apiFetch<MySidebarCommandsDto>('/quick-actions/sidebar/me')
}
