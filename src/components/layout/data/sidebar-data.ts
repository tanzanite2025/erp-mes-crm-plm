/**
 * 全局侧边栏菜单数据源(三层结构: group → L1 子组 → L2 菜单项)。
 *
 * 此文件是侧边栏的"配置即代码"——所有侧边栏入口在这里定义:
 *   - navGroupConfigs: 顶级 group(资源管理 / 采销 / 生产 / 工程 / 仓储等)
 *   - 每个 group 下 1-N 个 L1 子组或可点击域入口
 *   - 三级菜单代表业务域入口,域内关联 TAB 在 features/<module>/tabs.ts 单独维护
 *
 * 关键不变量:
 *   - id 稳定(权限/最近访问/搜索都依赖 id)
 *   - permissionId 通过 permissionIdForPath 派生,与路由权限映射保持一致
 *   - 同一侧边栏域内的 TAB 路由必须共享稳定 URL 前缀
 *   - getSidebarData(t) 调用时根据 locale 注入 i18n title
 *   - 侧边栏 L2 菜单进入后看到的 tabs 在 features/<module>/tabs.ts 单独维护(不在本文件)
 */
import type { TranslationKey } from '@/locales'
import {
  BarChart3,
  Barcode,
  Box,
  Calendar,
  CheckSquare,
  Cpu,
  Database,
  FileText,
  Gauge,
  ListChecks,
  HandCoins,
  ScanLine,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Package,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react'
import { getMenuPermissionForPath } from '@/features/authz/data/permission-catalog'
import type { NavGroup, NavNode, SidebarData } from '../types'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

type SidebarNodeConfig = {
  id: string
  titleKey: TranslationKey
  url?: string
  icon?: React.ElementType
  permissionId?: string | string[]
  preserveEmptyChildren?: boolean
  activeMatch?: string
  activeMatches?: string[]
  badgeKey?: string
  children?: SidebarNodeConfig[]
}

type SidebarGroupConfig = {
  id: string
  titleKey: TranslationKey
  children: SidebarNodeConfig[]
}

const defaultUser = {
  name: 'Administrator',
  email: 'admin@business.com',
  avatar: '',
}

const defaultTeam = {
  name: 'Workspace',
  logo: ShieldCheck,
  plan: 'Operations',
}

const permissionIdForPath = (path: string): string =>
  getMenuPermissionForPath(path)

const permissionIdsForPaths = (paths: readonly string[]): string[] =>
  paths.map((path) => permissionIdForPath(path))

const businessAnalysisProductionPaths = [
  '/business-analysis/production-capacity',
  '/business-analysis/production-load',
  '/business-analysis/production-efficiency',
] as const

const businessAnalysisQualityPaths = [
  '/business-analysis/scrap',
  '/business-analysis/defect-trend',
] as const

const businessAnalysisCustomerSalesPaths = [
  '/business-analysis/orders',
  '/business-analysis/customers',
] as const

const navGroupConfigs: SidebarGroupConfig[] = [
  {
    id: 'resource-management',
    titleKey: 'sidebar.groups.resourceManagement',
    children: [
      {
        id: 'dashboard',
        titleKey: 'sidebar.items.dashboard',
        url: '/dashboard',
        icon: BarChart3,
        permissionId: permissionIdForPath('/dashboard/overview'),
        activeMatch: '/dashboard',
      },
    ],
  },
  {
    id: 'purchase-and-sales',
    titleKey: 'sidebar.groups.purchaseAndSales',
    children: [
      {
        id: 'purchase-management-group',
        titleKey: 'sidebar.groups.purchaseManagement',
        icon: HandCoins,
        children: [
          {
            id: 'purchase-management',
            titleKey: 'sidebar.items.purchaseManagement',
            url: '/purchase',
            icon: Truck,
            permissionId: permissionIdForPath('/purchase'),
          },
        ],
      },
      {
        id: 'sales-management-group',
        titleKey: 'sidebar.groups.salesManagement',
        icon: BarChart3,
        children: [
          {
            id: 'sales-management',
            titleKey: 'sidebar.items.salesManagement',
            url: '/trading',
            icon: ShoppingBag,
            permissionId: permissionIdForPath('/trading'),
          },
          {
            id: 'quote-management',
            titleKey: 'sidebar.items.quoteManagement',
            url: '/quotes',
            icon: FileText,
            permissionId: permissionIdForPath('/quotes'),
          },
          {
            id: 'shipping-management',
            titleKey: 'sidebar.items.shippingManagement',
            url: '/shipping-management',
            icon: Package,
            permissionId: permissionIdForPath('/shipping-management'),
          },
        ],
      },
    ],
  },
  {
    id: 'production-management',
    titleKey: 'sidebar.groups.productionManagement',
    children: [
      {
        id: 'planning-center-group',
        titleKey: 'sidebar.groups.planningCenter',
        icon: Calendar,
        children: [
          {
            id: 'mrp',
            titleKey: 'sidebar.items.mrp',
            url: '/mrp',
            icon: Gauge,
            permissionId: permissionIdForPath('/mrp'),
          },
          {
            id: 'aps-scheduling',
            titleKey: 'sidebar.items.apsScheduling',
            url: '/aps-scheduling',
            icon: Calendar,
            permissionId: permissionIdForPath('/aps-scheduling'),
          },
        ],
      },
      {
        id: 'production-coordination-group',
        titleKey: 'sidebar.groups.productionCoordination',
        icon: CheckSquare,
        children: [
          {
            id: 'piecework',
            titleKey: 'sidebar.items.piecework',
            url: '/piecework',
            icon: CheckSquare,
            permissionId: permissionIdForPath('/piecework'),
          },
          {
            id: 'production-architecture',
            titleKey: 'sidebar.items.productionArchitecture',
            url: '/production-architecture',
            icon: Box,
            permissionId: permissionIdForPath('/production-architecture'),
          },
        ],
      },
    ],
  },
  {
    id: 'raw-materials-center',
    titleKey: 'sidebar.groups.rawMaterialsCenter',
    children: [
      {
        id: 'raw-materials-management-group',
        titleKey: 'sidebar.groups.rawMaterialsManagement',
        icon: Database,
        children: [
          {
            id: 'cutting-database',
            titleKey: 'sidebar.items.cuttingDatabase',
            url: '/raw-materials',
            icon: Database,
            permissionId: permissionIdForPath('/raw-materials'),
          },
          {
            id: 'cutting-operations',
            titleKey: 'sidebar.items.cuttingOperations',
            url: '/cutting-operations',
            icon: Calendar,
            permissionId: permissionIdForPath('/cutting-operations'),
          },
        ],
      },
      {
        id: 'engine-configuration',
        titleKey: 'sidebar.items.engineConfigGroup',
        icon: Sliders,
        children: [
          {
            id: 'cutting-engine',
            titleKey: 'sidebar.items.cuttingEngine',
            url: '/raw-materials-engine/config',
            activeMatch: '/raw-materials-engine',
            icon: Sliders,
            permissionId: permissionIdForPath('/raw-materials-engine/config'),
          },
        ],
      },
    ],
  },
  {
    id: 'business-analysis-management',
    titleKey: 'sidebar.groups.businessAnalysis',
    children: [
      {
        id: 'analysis-overview-group',
        titleKey: 'sidebar.groups.analysisOverview',
        icon: BarChart3,
        children: [
          {
            id: 'business-analysis-overview',
            titleKey: 'sidebar.items.businessAnalysisOverview',
            url: '/business-analysis/overview',
            icon: BarChart3,
            permissionId: permissionIdForPath('/business-analysis'),
          },
        ],
      },
      {
        id: 'production-analysis-group',
        titleKey: 'sidebar.groups.productionAnalysis',
        icon: Gauge,
        children: [
          {
            id: 'production-analysis-center',
            titleKey: 'sidebar.items.productionAnalysisCenter',
            url: '/business-analysis/production-capacity',
            activeMatches: [...businessAnalysisProductionPaths],
            icon: Gauge,
            permissionId: permissionIdsForPaths(
              businessAnalysisProductionPaths
            ),
          },
        ],
      },
      {
        id: 'quality-analysis-group',
        titleKey: 'sidebar.groups.qualityAnalysis',
        icon: ShieldCheck,
        children: [
          {
            id: 'quality-analysis-center',
            titleKey: 'sidebar.items.qualityAnalysisCenter',
            url: '/business-analysis/scrap',
            activeMatches: [...businessAnalysisQualityPaths],
            icon: ShieldCheck,
            permissionId: permissionIdsForPaths(businessAnalysisQualityPaths),
          },
        ],
      },
      {
        id: 'customer-sales-analysis-group',
        titleKey: 'sidebar.groups.customerSalesAnalysis',
        icon: Users,
        children: [
          {
            id: 'customer-sales-analysis-center',
            titleKey: 'sidebar.items.customerSalesAnalysisCenter',
            url: '/business-analysis/orders',
            activeMatches: [...businessAnalysisCustomerSalesPaths],
            icon: Users,
            permissionId: permissionIdsForPaths(
              businessAnalysisCustomerSalesPaths
            ),
          },
        ],
      },
    ],
  },
  {
    id: 'engineering-management',
    titleKey: 'sidebar.groups.engineeringManagement',
    children: [
      {
        id: 'engineering-database-group',
        titleKey: 'sidebar.groups.engineeringDatabase',
        icon: Database,
        children: [
          {
            id: 'engineering-database',
            titleKey: 'sidebar.items.engineeringDatabase',
            url: '/engineering-db',
            icon: Database,
            permissionId: permissionIdForPath('/engineering-db'),
          },
          {
            id: 'engineering-reference',
            titleKey: 'sidebar.items.engineeringReference',
            url: '/engineering-reference',
            icon: FileText,
            permissionId: permissionIdForPath('/engineering-reference'),
          },
        ],
      },
    ],
  },
  {
    id: 'quality-management',
    titleKey: 'sidebar.groups.qualityManagement',
    children: [
      {
        id: 'quality-standards-group',
        titleKey: 'sidebar.groups.qualityStandards',
        icon: Scale,
        children: [
          {
            id: 'quality-audit',
            titleKey: 'sidebar.items.qualityAudit',
            url: '/quality',
            icon: Scale,
            permissionId: permissionIdForPath('/quality'),
          },
        ],
      },
      {
        id: 'quality-operations-group',
        titleKey: 'sidebar.groups.qualityOperations',
        icon: ListChecks,
        children: [
          {
            id: 'quality-operations',
            titleKey: 'sidebar.items.qualityOperations',
            url: '/production-quality',
            icon: ListChecks,
            permissionId: permissionIdForPath('/production-quality'),
          },
        ],
      },
    ],
  },
  {
    id: 'product-management',
    titleKey: 'sidebar.groups.productManagement',
    children: [
      {
        id: 'product-config-group',
        titleKey: 'sidebar.groups.productConfig',
        icon: Box,
        children: [
          {
            id: 'product-engineering',
            titleKey: 'sidebar.items.productEngineering',
            url: '/engineering',
            icon: Box,
            permissionId: permissionIdForPath('/engineering'),
          },
          {
            id: 'product-structure',
            titleKey: 'sidebar.items.productStructure',
            url: '/product-structure',
            icon: Package,
            permissionId: permissionIdForPath('/product-structure'),
          },
        ],
      },
      {
        id: 'code-center-group',
        titleKey: 'sidebar.groups.codeCenter',
        icon: Barcode,
        children: [
          {
            id: 'linear-barcode',
            titleKey: 'sidebar.items.linearBarcode',
            url: '/code-center/linear-barcode',
            icon: Barcode,
            permissionId: permissionIdForPath('/code-center/linear-barcode'),
          },
          {
            id: 'shared-code-source',
            titleKey: 'sidebar.items.sharedCodeSource',
            url: '/code-center/shared-code-source',
            icon: Database,
            permissionId: permissionIdForPath(
              '/code-center/shared-code-source'
            ),
          },
        ],
      },
    ],
  },
  {
    id: 'warehouse-logistics',
    titleKey: 'sidebar.groups.warehouseLogistics',
    children: [
      {
        id: 'warehouse-management-group',
        titleKey: 'sidebar.groups.warehouseManagement',
        icon: Warehouse,
        children: [
          {
            id: 'warehouse-operations',
            titleKey: 'sidebar.items.warehouseOperations',
            url: '/warehouse',
            icon: Warehouse,
            permissionId: permissionIdForPath('/warehouse'),
          },
          {
            id: 'material-archive',
            titleKey: 'sidebar.items.materialArchive',
            url: '/materials',
            icon: Database,
            permissionId: permissionIdForPath('/materials'),
          },
          {
            id: 'warehouse-config',
            titleKey: 'sidebar.items.warehouseConfig',
            url: '/warehouse-config',
            icon: Sliders,
            permissionId: permissionIdForPath('/warehouse-config'),
          },
        ],
      },
      {
        id: 'logistics-group',
        titleKey: 'sidebar.groups.logisticsCenter',
        icon: Truck,
        children: [
          {
            id: 'logistics-config',
            titleKey: 'sidebar.items.vehicleMatching',
            url: '/logistics-config',
            icon: Truck,
            permissionId: permissionIdForPath('/logistics-config'),
          },
          {
            id: 'logistics-settings',
            titleKey: 'sidebar.items.logisticsSettings',
            url: '/logistics-settings',
            icon: Sliders,
            permissionId: permissionIdForPath('/logistics-settings'),
          },
        ],
      },
    ],
  },
  {
    id: 'asset-management',
    titleKey: 'sidebar.groups.resourceManagement',
    children: [
      {
        id: 'tooling-management',
        titleKey: 'sidebar.groups.toolingManagement',
        icon: Cpu,
        children: [
          {
            id: 'tooling-assets',
            titleKey: 'sidebar.items.toolingAssets',
            url: '/equipment-tooling/overview',
            activeMatch: '/equipment-tooling',
            icon: Cpu,
            permissionId: permissionIdForPath('/equipment-tooling/overview'),
          },
          {
            id: 'furnace-assets',
            titleKey: 'sidebar.items.furnaceManagement',
            url: '/tooling-furnaces',
            activeMatch: '/tooling-furnaces',
            icon: Gauge,
            permissionId: permissionIdForPath('/tooling-furnaces'),
          },
          {
            id: 'maintenance-center',
            titleKey: 'sidebar.items.maintenanceCenter',
            url: '/equipment-maintenance/overview',
            activeMatch: '/equipment-maintenance',
            icon: Cpu,
            permissionId: permissionIdForPath(
              '/equipment-maintenance/overview'
            ),
          },
        ],
      },
      {
        id: 'org-personnel-group',
        titleKey: 'sidebar.groups.orgPersonnel',
        icon: Users,
        children: [
          {
            id: 'personnel-center',
            titleKey: 'sidebar.items.personnelCenter',
            url: '/personnel',
            icon: Users,
            permissionId: permissionIdForPath('/personnel'),
          },
          {
            id: 'attendance-management',
            titleKey: 'sidebar.items.attendanceManagement',
            url: '/attendance-management/leave',
            activeMatch: '/attendance-management',
            icon: Calendar,
            permissionId: permissionIdForPath('/attendance-management'),
          },
        ],
      },
      {
        id: 'experimental-center-group',
        titleKey: 'sidebar.groups.experimentalCenter',
        icon: Cpu,
        children: [
          {
            id: 'experimental-center',
            titleKey: 'sidebar.groups.experimentalCenter',
            url: '/labs/experimental',
            icon: Cpu,
            permissionId: permissionIdForPath('/labs/experimental'),
          },
        ],
      },
    ],
  },
  {
    id: 'finance-management',
    titleKey: 'sidebar.groups.financeManagement',
    children: [
      {
        id: 'finance-config-group',
        titleKey: 'sidebar.groups.financeConfig',
        icon: Scale,
        children: [
          {
            id: 'finance-center',
            titleKey: 'sidebar.items.financeCenter',
            url: '/finance-management',
            icon: Scale,
            permissionId: permissionIdForPath('/finance-management'),
          },
          {
            id: 'finance-settlements',
            titleKey: 'sidebar.items.financeSettlements',
            url: '/finance-settlements',
            icon: HandCoins,
            permissionId: permissionIdForPath('/finance-settlements'),
          },
        ],
      },
    ],
  },
  {
    id: 'message-and-approval',
    titleKey: 'sidebar.groups.messageAndApproval',
    children: [
      {
        id: 'approval-group',
        titleKey: 'sidebar.groups.approvals',
        icon: ShieldCheck,
        children: [
          {
            id: 'approval-center',
            titleKey: 'sidebar.items.approvalCenter',
            url: '/approval',
            icon: ShieldCheck,
            permissionId: permissionIdForPath('/approval'),
            badgeKey: 'approval-unread',
          },
        ],
      },
      {
        id: 'messages-group',
        titleKey: 'sidebar.groups.messages',
        icon: FileText,
        children: [
          {
            id: 'message-center',
            titleKey: 'sidebar.items.messageCenter',
            url: '/message-center',
            icon: FileText,
            permissionId: permissionIdForPath('/message-center'),
          },
        ],
      },
    ],
  },
  {
    id: 'system-management-root',
    titleKey: 'sidebar.groups.systemManagement',
    children: [
      {
        id: 'terminal-config-group',
        titleKey: 'sidebar.groups.terminalConfig',
        icon: ScanLine,
        children: [
          {
            id: 'pda-shell',
            titleKey: 'sidebar.items.pdaShell',
            url: '/pda-shell',
            icon: ScanLine,
            permissionId: permissionIdForPath('/pda-shell'),
          },
          {
            id: 'terminal-config',
            titleKey: 'sidebar.items.terminalConfig',
            url: '/terminal-config',
            icon: ScanLine,
            permissionId: permissionIdForPath('/terminal-config'),
          },
        ],
      },
      {
        id: 'quick-actions-group',
        titleKey: 'sidebar.groups.quickActions',
        icon: ListChecks,
        children: [
          {
            id: 'sidebar-command-config',
            titleKey: 'sidebar.items.sidebarCommandConfig',
            url: '/sidebar-command/library',
            activeMatch: '/sidebar-command',
            icon: ListChecks,
            permissionId: permissionIdForPath('/sidebar-command/library'),
          },
        ],
      },
      {
        id: 'system-admin-group',
        titleKey: 'sidebar.groups.systemAdmin',
        icon: ShieldCheck,
        children: [
          {
            id: 'system-management',
            titleKey: 'sidebar.items.systemManagement',
            url: '/system-management',
            icon: ShieldCheck,
            permissionId: permissionIdForPath('/system-management'),
            badgeKey: 'system-alert',
          },
          {
            id: 'basic-settings',
            titleKey: 'sidebar.items.basicSettings',
            url: '/basic-settings',
            icon: Sliders,
            permissionId: permissionIdForPath('/basic-settings'),
          },
        ],
      },
    ],
  },
]

function localizeNavNode(t: TranslateFn, node: SidebarNodeConfig): NavNode {
  return {
    id: node.id,
    title: t(node.titleKey),
    url: node.url,
    icon: node.icon,
    permissionId: node.permissionId,
    preserveEmptyChildren: node.preserveEmptyChildren,
    activeMatch: node.activeMatch,
    activeMatches: node.activeMatches,
    badgeKey: node.badgeKey,
    children: node.children?.map((child) => localizeNavNode(t, child)),
  }
}

function localizeNavGroup(t: TranslateFn, group: SidebarGroupConfig): NavGroup {
  return {
    id: group.id,
    title: t(group.titleKey),
    children: group.children.map((item) => localizeNavNode(t, item)),
  }
}

export function getSidebarData(t: TranslateFn): SidebarData {
  return {
    user: defaultUser,
    teams: [
      {
        ...defaultTeam,
        name: t('sidebar.team.defaultName'),
        plan: t('sidebar.team.defaultPlan'),
      },
    ],
    navGroups: navGroupConfigs.map((group) => localizeNavGroup(t, group)),
  }
}

export const topNav: { title: string; href: string }[] = []
