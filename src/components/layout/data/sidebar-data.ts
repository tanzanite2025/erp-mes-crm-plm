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
import type { SidebarData } from '../types'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

type SidebarItemConfig = {
  titleKey: TranslationKey
  url: string
  icon: React.ElementType
  permissionId: string
}

type SidebarGroupConfig = {
  titleKey: TranslationKey
  items: SidebarItemConfig[]
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
    titleKey: 'sidebar.groups.resourceManagement',
    items: [
      {
        titleKey: 'sidebar.items.dashboard',
        url: '/dashboard/overview',
        icon: BarChart3,
        permissionId: permissionIdForPath('/dashboard/overview'),
      },
    ],
  },
  {
    titleKey: 'sidebar.groups.purchaseManagement',
    items: [
      {
        titleKey: 'sidebar.items.purchaseManagement',
        url: '/purchase',
        icon: Truck,
        permissionId: permissionIdForPath('/purchase'),
      },
    ],
  },
  {
    titleKey: 'sidebar.groups.planningCenter',
    items: [
      {
        titleKey: 'sidebar.items.mrp',
        url: '/mrp',
        icon: Gauge,
        permissionId: permissionIdForPath('/mrp'),
      },
      {
        titleKey: 'sidebar.items.apsScheduling',
        url: '/aps-scheduling',
        icon: Calendar,
        permissionId: permissionIdForPath('/aps-scheduling'),
      },
    ],
  },
  {
    titleKey: 'sidebar.groups.rawMaterialsManagement',
    items: [
      {
        titleKey: 'sidebar.items.cuttingDatabase',
        url: '/raw-materials',
        icon: Database,
        permissionId: permissionIdForPath('/raw-materials'),
      },
      {
        titleKey: 'sidebar.items.cuttingOperations',
        url: '/cutting-operations',
        icon: Calendar,
        permissionId: permissionIdForPath('/cutting-operations'),
      },
    ],
  },
  {
    titleKey: 'sidebar.groups.salesManagement',
    items: [
      {
        titleKey: 'sidebar.items.salesManagement',
        url: '/trading',
        icon: ShoppingBag,
        permissionId: permissionIdForPath('/trading'),
      },
      {
        titleKey: 'sidebar.items.quoteManagement',
        url: '/quotes',
        icon: FileText,
        permissionId: permissionIdForPath('/quotes'),
      },
      {
        titleKey: 'sidebar.items.shippingManagement',
        url: '/shipping-management',
        icon: Package,
        permissionId: permissionIdForPath('/shipping-management'),
      },
      {
        titleKey: 'sidebar.items.salesAnalysis',
        url: '/sales-analysis',
        icon: BarChart3,
        permissionId: permissionIdForPath('/sales-analysis'),
      },
    ],
  },
  {
    titleKey: 'sidebar.groups.engineeringManagement',
    items: [
      {
        titleKey: 'sidebar.items.productEngineering',
        url: '/engineering',
        icon: Box,
        permissionId: permissionIdForPath('/engineering'),
      },
      {
        titleKey: 'sidebar.items.engineeringDatabase',
        url: '/engineering-db',
        icon: Database,
        permissionId: permissionIdForPath('/engineering-db'),
      },
      {
        titleKey: 'sidebar.items.engineeringReference',
        url: '/engineering-reference',
        icon: FileText,
        permissionId: permissionIdForPath('/engineering-reference'),
      },
      {
        titleKey: 'sidebar.items.qualityAudit',
        url: '/quality',
        icon: Scale,
        permissionId: permissionIdForPath('/quality'),
      },
    ],
  },
  {
    titleKey: 'sidebar.groups.warehouseManagement',
    items: [
      {
        titleKey: 'sidebar.items.warehouseOperations',
        url: '/warehouse',
        icon: Warehouse,
        permissionId: permissionIdForPath('/warehouse'),
      },
      {
        titleKey: 'sidebar.items.materialArchive',
        url: '/materials',
        icon: Database,
        permissionId: permissionIdForPath('/materials'),
      },
      {
        titleKey: 'sidebar.items.warehouseConfig',
        url: '/warehouse-config',
        icon: Sliders,
        permissionId: permissionIdForPath('/warehouse-config'),
      },
    ],
  },
  {
    titleKey: 'sidebar.groups.experimentalCenter',
    items: [
      {
        titleKey: 'sidebar.groups.experimentalCenter',
        url: '/labs/experimental',
        icon: Cpu,
        permissionId: permissionIdForPath('/labs/experimental'),
      },
    ],
  },
  {
    titleKey: 'sidebar.groups.productionCoordination',
    items: [
      {
        titleKey: 'sidebar.items.piecework',
        url: '/piecework',
        icon: CheckSquare,
        permissionId: permissionIdForPath('/piecework'),
      },
      {
        titleKey: 'sidebar.items.productionArchitecture',
        url: '/production-architecture',
        icon: Box,
        permissionId: permissionIdForPath('/production-architecture'),
      },
      {
        titleKey: 'sidebar.items.qualityOperations',
        url: '/production-quality',
        icon: ListChecks,
        permissionId: permissionIdForPath('/production-quality'),
      },
    ],
  },
  {
    titleKey: 'sidebar.groups.toolingManagement',
    items: [
      {
        titleKey: 'sidebar.items.toolingAssets',
        url: '/equipment-tooling/overview',
        icon: Cpu,
        permissionId: permissionIdForPath('/equipment-tooling/overview'),
      },
      {
        titleKey: 'sidebar.items.furnaceAssets',
        url: '/furnaces',
        icon: Gauge,
        permissionId: permissionIdForPath('/furnaces'),
      },
    ],
  },
  {
    titleKey: 'sidebar.groups.orgPersonnel',
    items: [
      {
        titleKey: 'sidebar.items.personnelCenter',
        url: '/personnel',
        icon: Users,
        permissionId: permissionIdForPath('/personnel'),
      },
      {
        titleKey: 'sidebar.items.hallOfFame',
        url: '/hall-of-fame',
        icon: Trophy,
        permissionId: permissionIdForPath('/hall-of-fame'),
      },
    ],
  },
  {
    titleKey: 'sidebar.groups.logistics',
    items: [
      {
        titleKey: 'sidebar.items.logisticsConfig',
        url: '/logistics-config',
        icon: Truck,
        permissionId: permissionIdForPath('/logistics-config'),
      },
      {
        titleKey: 'sidebar.items.logisticsSettings',
        url: '/logistics-settings',
        icon: Sliders,
        permissionId: permissionIdForPath('/logistics-settings'),
      },
    ],
  },
  {
    titleKey: 'sidebar.groups.financeManagement',
    items: [
      {
        titleKey: 'sidebar.items.financeCenter',
        url: '/finance-management',
        icon: Scale,
        permissionId: permissionIdForPath('/finance-management'),
      },
    ],
  },
  {
    titleKey: 'sidebar.groups.codeCenter',
    items: [
      {
        titleKey: 'sidebar.items.linearBarcode',
        url: '/code-center/linear-barcode',
        icon: Barcode,
        permissionId: permissionIdForPath('/code-center/linear-barcode'),
      },
      {
        titleKey: 'sidebar.items.dmCode',
        url: '/code-center/dm-code',
        icon: ScanLine,
        permissionId: permissionIdForPath('/code-center/dm-code'),
      },
      {
        titleKey: 'sidebar.items.sharedCodeSource',
        url: '/code-center/shared-code-source',
        icon: Database,
        permissionId: permissionIdForPath('/code-center/shared-code-source'),
      },
    ],
  },
  {
    titleKey: 'sidebar.groups.systemSettings',
    items: [
      {
        titleKey: 'sidebar.items.pdaShell',
        url: '/pda-shell',
        icon: ScanLine,
        permissionId: permissionIdForPath('/pda-shell'),
      },
      {
        titleKey: 'sidebar.items.terminalConfig',
        url: '/terminal-config',
        icon: ScanLine,
        permissionId: permissionIdForPath('/terminal-config'),
      },
      {
        titleKey: 'sidebar.items.sidebarCommandAssignment',
        url: '/sidebar-command-library',
        icon: ListChecks,
        permissionId: permissionIdForPath('/sidebar-command-library'),
      },
      {
        titleKey: 'sidebar.items.systemManagement',
        url: '/system-management',
        icon: ShieldCheck,
        permissionId: permissionIdForPath('/system-management'),
      },
      {
        titleKey: 'sidebar.items.approvalCenter',
        url: '/approval',
        icon: ShieldCheck,
        permissionId: permissionIdForPath('/approval'),
      },
      {
        titleKey: 'sidebar.items.basicSettings',
        url: '/basic-settings',
        icon: Sliders,
        permissionId: permissionIdForPath('/basic-settings'),
      },
    ],
  },
]

export const sidebarData: SidebarData = {
  user: defaultUser,
  teams: [defaultTeam],
  navGroups: [
    {
      title: '资源管理',
      items: [
        {
          title: '仪表盘',
          url: '/dashboard/overview',
          icon: BarChart3,
          permissionId: permissionIdForPath('/dashboard/overview'),
        },
        {
          title: '原材料管理',
          url: '/raw-materials',
          icon: Database,
          permissionId: permissionIdForPath('/raw-materials'),
        },
      ],
    },
    {
      title: '采购管理',
      items: [
        {
          title: '采购管理',
          url: '/purchase',
          icon: Truck,
          permissionId: permissionIdForPath('/purchase'),
        },
      ],
    },
    {
      title: '计划中心',
      items: [
        {
          title: 'MRP',
          url: '/mrp',
          icon: Gauge,
          permissionId: permissionIdForPath('/mrp'),
        },
        {
          title: 'APS排产',
          url: '/aps-scheduling',
          icon: Calendar,
          permissionId: permissionIdForPath('/aps-scheduling'),
        },
      ],
    },
    {
      title: '销售管理',
      items: [
        {
          title: '销售管理',
          url: '/trading',
          icon: ShoppingBag,
          permissionId: permissionIdForPath('/trading'),
        },
        {
          title: '报价管理',
          url: '/quotes',
          icon: FileText,
          permissionId: permissionIdForPath('/quotes'),
        },
        {
          title: '发货管理',
          url: '/shipping-management',
          icon: Package,
          permissionId: permissionIdForPath('/shipping-management'),
        },
        {
          title: '销售分析',
          url: '/sales-analysis',
          icon: BarChart3,
          permissionId: permissionIdForPath('/sales-analysis'),
        },
      ],
    },
    {
      title: '工程管理',
      items: [
        {
          title: '产品工程管理',
          url: '/engineering',
          icon: Box,
          permissionId: permissionIdForPath('/engineering'),
        },
        {
          title: '工程数据库',
          url: '/engineering-db',
          icon: Database,
          permissionId: permissionIdForPath('/engineering-db'),
        },
        {
          title: '品质基准',
          url: '/quality',
          icon: Scale,
          permissionId: permissionIdForPath('/quality'),
        },
      ],
    },
    {
      title: '仓储',
      items: [
        {
          title: '仓储作业',
          url: '/warehouse',
          icon: Warehouse,
          permissionId: permissionIdForPath('/warehouse'),
        },
        {
          title: '物料档案',
          url: '/materials',
          icon: Database,
          permissionId: permissionIdForPath('/materials'),
        },
        {
          title: '仓储配置',
          url: '/warehouse-config',
          icon: Sliders,
          permissionId: permissionIdForPath('/warehouse-config'),
        },
      ],
    },
    {
      title: '实验中心',
      items: [
        {
          title: '实验中心',
          url: '/labs/experimental',
          icon: Cpu,
          permissionId: permissionIdForPath('/labs/experimental'),
        },
      ],
    },
    {
      title: '生产协同',
      items: [
        {
          title: '计件管理',
          url: '/piecework',
          icon: CheckSquare,
          permissionId: permissionIdForPath('/piecework'),
        },
        {
          title: '品质作业',
          url: '/production-quality',
          icon: ListChecks,
          permissionId: permissionIdForPath('/production-quality'),
        },
      ],
    },
    {
      title: '工装管理',
      items: [
        {
          title: '模具资产管理',
          url: '/equipment-tooling/overview',
          icon: Cpu,
          permissionId: permissionIdForPath('/equipment-tooling/overview'),
        },
        {
          title: '炉台资产档案',
          url: '/furnaces',
          icon: Gauge,
          permissionId: permissionIdForPath('/furnaces'),
        },
      ],
    },
    {
      title: '物流',
      items: [
        {
          title: '物流',
          url: '/logistics-config',
          icon: Truck,
          permissionId: permissionIdForPath('/logistics-config'),
        },
        {
          title: '物流配置',
          url: '/logistics-settings',
          icon: Sliders,
          permissionId: permissionIdForPath('/logistics-settings'),
        },
      ],
    },
    {
      title: '财务管理',
      items: [
        {
          title: '财务中心',
          url: '/finance-management',
          icon: Scale,
          permissionId: permissionIdForPath('/finance-management'),
        },
      ],
    },
    {
      title: '编码中心',
      items: [
        {
          title: '一维码',
          url: '/code-center/linear-barcode',
          icon: Barcode,
          permissionId: permissionIdForPath('/code-center/linear-barcode'),
        },
        {
          title: 'DM码',
          url: '/code-center/dm-code',
          icon: ScanLine,
          permissionId: permissionIdForPath('/code-center/dm-code'),
        },
      ],
    },
    {
      title: '系统配置',
      items: [
        {
          title: 'Pda Shell',
          url: '/pda-shell',
          icon: ScanLine,
          permissionId: permissionIdForPath('/pda-shell'),
        },
        {
          title: '人事账号中心',
          url: '/personnel',
          icon: Users,
          permissionId: permissionIdForPath('/personnel'),
        },
        {
          title: '终端配置',
          url: '/terminal-config',
          icon: ScanLine,
          permissionId: permissionIdForPath('/terminal-config'),
        },
        {
          title: '快捷操作配置',
          url: '/sidebar-command-library',
          icon: ListChecks,
          permissionId: permissionIdForPath('/sidebar-command-library'),
        },
        {
          title: '系统管理',
          url: '/system-management',
          icon: ShieldCheck,
          permissionId: permissionIdForPath('/system-management'),
        },
        {
          title: '审批中心',
          url: '/approval',
          icon: ShieldCheck,
          permissionId: permissionIdForPath('/approval'),
        },
        {
          title: '基础配置',
          url: '/basic-settings',
          icon: Sliders,
          permissionId: permissionIdForPath('/basic-settings'),
        },
      ],
    },
  ],
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
    navGroups: navGroupConfigs.map((group) => ({
      title: t(group.titleKey),
      items: group.items.map((item) => ({
        title: t(item.titleKey),
        url: item.url,
        icon: item.icon,
        permissionId: item.permissionId,
      })),
    })),
  }
}

export const topNav: { title: string; href: string }[] = []
