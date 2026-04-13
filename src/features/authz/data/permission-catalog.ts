import {
  buildPermissionId,
  normalizePermissionPath,
  resolveRootPathForRoute,
} from './permission-path-utils'

export type MenuPermissionDefinition = {
  id: string
  label: string
  desc: string
  icon: string
  rootPath: string
}

export const PERMISSION_VERSION = '1.1.0'

/**
 * 权限清单（Permission Catalog）
 * 系统菜单权限的单一真实源。
 */
export const MENU_PERMISSIONS = {
  dashboard: {
    id: 'menu_dashboard',
    label: '访问：仪表盘',
    desc: '允许进入系统主控台',
    icon: 'BarChart3',
    rootPath: '/dashboard',
  },
  warehouse: {
    id: 'menu_warehouse',
    label: '访问：仓储',
    desc: '允许进入仓储与库存管理',
    icon: 'Warehouse',
    rootPath: '/warehouse',
  },
  mrp: {
    id: 'menu_mrp',
    label: '\u8bbf\u95ee\uff1aMRP',
    desc: '\u5141\u8bb8\u8fdb\u5165 MRP \u6a21\u5757',
    icon: 'Gauge',
    rootPath: '/mrp',
  },
  trading: {
    id: 'menu_trading',
    label: '访问：购销 / 采购',
    desc: '允许进入 Trading 与 Purchase 模块',
    icon: 'ShoppingBag',
    rootPath: '/trading',
  },
  engineering: {
    id: 'menu_engineering',
    label: '访问：工程管理',
    desc: '允许进入工程相关模块',
    icon: 'Box',
    rootPath: '/engineering',
  },
  quality: {
    id: 'menu_quality',
    label: '访问：品质中心',
    desc: '允许进入品质审计和实验',
    icon: 'Scale',
    rootPath: '/quality',
  },
  prodConfig: {
    id: 'menu_prod_config',
    label: '访问：生产配置',
    desc: '允许进入生产配置与追溯模块',
    icon: 'Gauge',
    rootPath: '/wheel-trace',
  },
  equipment: {
    id: 'menu_equipment',
    label: '访问：工装管理',
    desc: '允许进入设备工装模块',
    icon: 'Cpu',
    rootPath: '/equipment-tooling',
  },
  org: {
    id: 'menu_org',
    label: '访问：人事中心',
    desc: '允许进入人员组织管理',
    icon: 'Users',
    rootPath: '/personnel',
  },
  piecework: {
    id: 'menu_piecework',
    label: '访问：计件管理',
    desc: '允许进入计件管理模块',
    icon: 'CheckSquare',
    rootPath: '/piecework',
  },
  system: {
    id: 'menu_system',
    label: '访问：系统管理',
    desc: '允许进入系统管理',
    icon: 'ShieldCheck',
    rootPath: '/system-management',
  },
  approval: {
    id: 'menu_approval',
    label: '访问：审批中心',
    desc: '允许进入审批相关页面',
    icon: 'ShieldCheck',
    rootPath: '/approval',
  },
  settings: {
    id: 'menu_settings',
    label: '访问：配置中心',
    desc: '允许进入系统配置',
    icon: 'Sliders',
    rootPath: '/basic-settings',
  },
  pda: {
    id: 'menu_pda',
    label: '访问：PDA Shell',
    desc: '允许进入 PDA 终端工作台',
    icon: 'ScanLine',
    rootPath: '/pda-shell',
  },
} as const satisfies Record<string, MenuPermissionDefinition>

export const ROUTE_TO_MENU_MAPPING: Record<string, keyof typeof MENU_PERMISSIONS> = {
  '/dashboard': 'dashboard',
  '/warehouse': 'warehouse',
  '/mrp': 'mrp',
  '/trading': 'trading',
  '/purchase': 'trading',
  '/engineering': 'engineering',
  '/materials': 'engineering',
  '/engineering-db': 'engineering',
  '/quality': 'quality',
  '/labs': 'quality',
  '/experimental': 'quality',
  '/equipment-tooling': 'equipment',
  '/furnaces': 'equipment',
  '/personnel': 'org',
  '/piecework': 'piecework',
  '/system-management': 'system',
  '/approval': 'approval',
  '/basic-settings': 'settings',
  '/print-mgmt': 'settings',
  '/terminal-config': 'settings',
  '/finance-management': 'settings',
  '/personal-workbench': 'pda',
  '/pda-shell': 'pda',
  '/wheel-trace': 'prodConfig',
}

/**
 * Generate a stable permission id from route path.
 */
export function generatePermissionId(type: 'page' | 'tab', path: string): string {
  return buildPermissionId(type, path)
}

/**
 * Resolve the menu permission id for a route path.
 */
export function getMenuPermissionForPath(path: string): string {
  const rootPath = resolveRootPathForRoute(path)
  const menuKey = ROUTE_TO_MENU_MAPPING[rootPath]

  if (!menuKey) {
    throw new Error(`[permission-catalog] Unmapped top-level path: ${rootPath}`)
  }

  return MENU_PERMISSIONS[menuKey].id
}

/**
 * Placeholder migration hook for future permission id evolution.
 *
 * Current behavior is non-destructive passthrough.
 */
export function migratePermissions(from: string, to: string, permissionIds: string[]): string[] {
  if (!from || !to || from === to) {
    return [...permissionIds]
  }

  return [...permissionIds]
}

/**
 * Export catalog for verification scripts and backend reconciliation.
 */
export function exportPermissionCatalog() {
  return {
    menus: Object.values(MENU_PERMISSIONS),
    routeMapping: ROUTE_TO_MENU_MAPPING,
  }
}

export function getRootPathForRoute(path: string): string {
  return resolveRootPathForRoute(path)
}

export { normalizePermissionPath }
