import type { SidebarCommandDefinitionDto } from '../api/shared'
import type { PresentedSidebarCommand } from '../types'

export function toPresentedSidebarCommand(
  command: SidebarCommandDefinitionDto,
  fallbackDescription: string
): PresentedSidebarCommand {
  return {
    code: command.commandId,
    title: command.title,
    description: command.description || fallbackDescription,
    route: command.route,
    category: command.category,
    sortOrder: command.sortOrder,
    iconName: command.icon,
  }
}

export function sidebarCommandMatchesSearch(
  command: SidebarCommandDefinitionDto,
  keyword: string
) {
  if (!keyword) return true

  return [
    command.commandId,
    command.title,
    command.description,
    command.route,
    command.category,
    command.status,
  ]
    .join(' ')
    .toLowerCase()
    .includes(keyword)
}
