import type { SidebarCommandDefinitionDto } from '@/features/sidebar-command-config/services'
import { quickActionRegistry } from '../data/quick-action-registry'
import type { QuickActionDefinition, SidebarQuickActionView } from '../types'

const privateQuickActionIds = [
  'personal_workbench_photo',
  'personal_workbench_video',
  'personal_workbench_buffer',
] satisfies QuickActionDefinition['id'][]

// Only full backend command definitions are accepted for business shortcuts.
// Do not add string-ID compatibility or static registry fallback for business
// commands; new sidebar commands must come from /quick-actions/sidebar/me as
// businessCommands.
export function getSidebarQuickActions(
  businessCommands: SidebarCommandDefinitionDto[],
  privateCommandIds: string[] = privateQuickActionIds
): SidebarQuickActionView[] {
  const byId = new Map(quickActionRegistry.map((action) => [action.id, action]))
  const result: SidebarQuickActionView[] = []

  for (const command of businessCommands) {
    if (command.enabled && command.status !== 'disabled') {
      result.push({
        id: command.commandId,
        targetKind: 'route',
        title: command.title,
        iconName: command.icon,
        to: command.route,
        search: stringifySearchParams(command.searchParams),
        enabled: command.enabled,
        sortOrder: command.sortOrder,
        isPrivate: false,
      })
    }
  }

  for (const commandId of privateCommandIds) {
    const action = byId.get(commandId as QuickActionDefinition['id'])
    if (action?.enabled) {
      result.push(toSidebarQuickActionView(action, true))
    }
  }

  return result
}

function toSidebarQuickActionView(
  action: QuickActionDefinition,
  isPrivate: boolean
): SidebarQuickActionView {
  return {
    id: action.id,
    targetKind: action.targetKind,
    titleKey: action.titleKey,
    iconName: getRegistryActionIconName(action.id),
    to: action.to,
    search: action.search ? stringifySearchParams(action.search) : undefined,
    enabled: action.enabled,
    sortOrder: action.sortOrder,
    isPrivate,
  }
}

function getRegistryActionIconName(actionId: QuickActionDefinition['id']) {
  switch (actionId) {
    case 'wheel_trace_scan':
      return 'SearchCheck'
    case 'warehouse_inbound_scan':
      return 'PackagePlus'
    case 'warehouse_shipment_scan':
      return 'ScanLine'
    case 'warehouse_stocktake_scan':
      return 'ClipboardCheck'
    case 'personal_workbench_photo':
      return 'Camera'
    case 'personal_workbench_video':
      return 'Video'
    case 'personal_workbench_buffer':
      return 'NotebookPen'
  }
}

function stringifySearchParams(
  params: Record<string, unknown> | Record<string, string>
) {
  return Object.entries(params).reduce<Record<string, string>>(
    (result, [key, value]) => {
      if (value !== undefined && value !== null) {
        result[key] = String(value)
      }
      return result
    },
    {}
  )
}
