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

export const PERMISSION_VERSION = '1.1.1'

const LEGACY_PERMISSION_ID_ALIASES: Record<string, string> = {
  action_approval_config_manage: 'action_approval_review',
}

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
  warehouseConfig: {
    id: 'menu_warehouse_config',
    label: '访问：仓储配置',
    desc: '允许进入仓储配置、装箱组装与仓库基础配置',
    icon: 'Sliders',
    rootPath: '/warehouse-config',
  },
  mrp: {
    id: 'menu_mrp',
    label: '访问：MRP',
    desc: '允许进入物料需求计划模块',
    icon: 'Gauge',
    rootPath: '/mrp',
  },
  apsScheduling: {
    id: 'menu_aps_scheduling',
    label: '访问：APS排产',
    desc: '允许进入高级排产、计划看板与排产引擎配置',
    icon: 'Calendar',
    rootPath: '/aps-scheduling',
  },
  trading: {
    id: 'menu_trading',
    label: '访问：销售管理',
    desc: '允许进入客户、销售订单、报价与发货相关模块',
    icon: 'ShoppingBag',
    rootPath: '/trading',
  },
  purchase: {
    id: 'menu_purchase',
    label: '访问：采购管理',
    desc: '允许进入采购订单、供应商、应付与采购物流模块',
    icon: 'Truck',
    rootPath: '/purchase',
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
    label: '访问：品质基准 / 作业',
    desc: '允许进入品质基准、品质作业与实验',
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
  codeCenter: {
    id: 'menu_code_center',
    label: '访问：编码中心',
    desc: '允许进入编码规则、条码与发号相关页面',
    icon: 'Barcode',
    rootPath: '/code-center',
  },
  pda: {
    id: 'menu_pda',
    label: '访问：PDA Shell',
    desc: '允许进入 PDA 终端工作台',
    icon: 'ScanLine',
    rootPath: '/pda-shell',
  },
} as const satisfies Record<string, MenuPermissionDefinition>

export const ROUTE_TO_MENU_MAPPING: Record<
  string,
  keyof typeof MENU_PERMISSIONS
> = {
  '/dashboard': 'dashboard',
  '/warehouse': 'warehouse',
  '/warehouse-config': 'warehouseConfig',
  '/mrp': 'mrp',
  '/raw-materials': 'trading',
  '/trading': 'trading',
  '/sales-analysis': 'trading',
  '/quotes': 'trading',
  '/shipping-management': 'trading',
  '/purchase': 'purchase',
  '/engineering': 'engineering',
  '/product-structure': 'engineering',
  '/materials': 'engineering',
  '/engineering-db': 'engineering',
  '/engineering-reference': 'engineering',
  '/quality': 'quality',
  '/production-quality': 'quality',
  '/labs': 'quality',
  '/experimental': 'quality',
  '/equipment-tooling': 'equipment',
  '/tooling-furnaces': 'equipment',
  '/personnel': 'org',
  '/leave-management': 'org',
  '/hall-of-fame': 'org',
  '/piecework': 'piecework',
  '/cutting-operations': 'piecework',
  '/aps-scheduling': 'apsScheduling',
  '/production-architecture': 'piecework',
  '/system-management': 'system',
  '/approval': 'approval',
  '/message-center': 'approval',
  '/basic-settings': 'settings',
  '/sidebar-command-assignment': 'settings',
  '/sidebar-command-library': 'settings',
  '/code-center': 'codeCenter',
  '/terminal-config': 'settings',
  '/logistics-config': 'settings',
  '/logistics-settings': 'settings',
  '/finance-management': 'settings',
  '/personal-workbench': 'pda',
  '/pda-shell': 'pda',
  '/wheel-trace': 'prodConfig',
}

/**
 * Generate a stable permission id from route path.
 */
export function generatePermissionId(
  type: 'page' | 'tab',
  path: string
): string {
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
export function migratePermissions(
  _from: string,
  _to: string,
  permissionIds: string[]
): string[] {
  return Array.from(
    new Set(
      permissionIds
        .map((permissionId) => permissionId.trim().toLowerCase())
        .filter(Boolean)
        .map((permissionId) => LEGACY_PERMISSION_ID_ALIASES[permissionId] || permissionId),
    ),
  )
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
