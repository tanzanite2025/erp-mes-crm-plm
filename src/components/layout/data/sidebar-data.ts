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
  Trophy,
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
  permissionId?: string
  activeMatch?: string
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
  name: 'Digital Management ERP',
  logo: ShieldCheck,
  plan: 'Professional Edition',
}

const permissionIdForPath = (path: string): string =>
  getMenuPermissionForPath(path)

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
          {
            id: 'sales-analysis',
            titleKey: 'sidebar.items.salesAnalysis',
            url: '/sales-analysis',
            icon: BarChart3,
            permissionId: permissionIdForPath('/sales-analysis'),
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
    id: 'raw-materials-management',
    titleKey: 'sidebar.groups.rawMaterialsManagement',
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
    id: 'engineering-management',
    titleKey: 'sidebar.groups.engineeringManagement',
    children: [
      {
        id: 'product-engineering',
        titleKey: 'sidebar.items.productEngineering',
        url: '/engineering',
        icon: Box,
        permissionId: permissionIdForPath('/engineering'),
      },
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
    id: 'warehouse-management',
    titleKey: 'sidebar.groups.warehouseManagement',
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
    id: 'experimental-center',
    titleKey: 'sidebar.groups.experimentalCenter',
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
  {
    id: 'asset-management',
    titleKey: 'sidebar.groups.assetManagement',
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
            icon: Cpu,
            permissionId: permissionIdForPath('/equipment-tooling/overview'),
          },
          {
            id: 'furnace-assets',
            titleKey: 'sidebar.items.furnaceAssets',
            url: '/furnaces',
            icon: Gauge,
            permissionId: permissionIdForPath('/furnaces'),
          },
        ],
      },
    ],
  },
  {
    id: 'org-personnel',
    titleKey: 'sidebar.groups.orgPersonnel',
    children: [
      {
        id: 'personnel-center',
        titleKey: 'sidebar.items.personnelCenter',
        url: '/personnel',
        icon: Users,
        permissionId: permissionIdForPath('/personnel'),
      },
      {
        id: 'hall-of-fame',
        titleKey: 'sidebar.items.hallOfFame',
        url: '/hall-of-fame',
        icon: Trophy,
        permissionId: permissionIdForPath('/hall-of-fame'),
      },
    ],
  },
  {
    id: 'logistics',
    titleKey: 'sidebar.groups.logistics',
    children: [
      {
        id: 'logistics-config',
        titleKey: 'sidebar.items.logisticsConfig',
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
  {
    id: 'finance-management',
    titleKey: 'sidebar.groups.financeManagement',
    children: [
      {
        id: 'finance-center',
        titleKey: 'sidebar.items.financeCenter',
        url: '/finance-management',
        icon: Scale,
        permissionId: permissionIdForPath('/finance-management'),
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
            id: 'messages-shell',
            titleKey: 'sidebar.groups.messages',
            icon: FileText,
          },
        ],
      },
    ],
  },
  {
    id: 'code-center',
    titleKey: 'sidebar.groups.codeCenter',
    children: [
      {
        id: 'linear-barcode',
        titleKey: 'sidebar.items.linearBarcode',
        url: '/code-center/linear-barcode',
        icon: Barcode,
        permissionId: permissionIdForPath('/code-center/linear-barcode'),
      },
      {
        id: 'dm-code',
        titleKey: 'sidebar.items.dmCode',
        url: '/code-center/dm-code',
        icon: ScanLine,
        permissionId: permissionIdForPath('/code-center/dm-code'),
      },
      {
        id: 'shared-code-source',
        titleKey: 'sidebar.items.sharedCodeSource',
        url: '/code-center/shared-code-source',
        icon: Database,
        permissionId: permissionIdForPath('/code-center/shared-code-source'),
      },
    ],
  },
  {
    id: 'system-settings',
    titleKey: 'sidebar.groups.systemSettings',
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
      {
        id: 'sidebar-command-assignment',
        titleKey: 'sidebar.items.sidebarCommandAssignment',
        url: '/sidebar-command-library',
        icon: ListChecks,
        permissionId: permissionIdForPath('/sidebar-command-library'),
      },
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
]

function localizeNavNode(t: TranslateFn, node: SidebarNodeConfig): NavNode {
  return {
    id: node.id,
    title: t(node.titleKey),
    url: node.url,
    icon: node.icon,
    permissionId: node.permissionId,
    activeMatch: node.activeMatch,
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
