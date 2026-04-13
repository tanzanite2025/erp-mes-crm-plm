import {
  BarChart3,
  Box,
  Calendar,
  CheckSquare,
  Cpu,
  Database,
  Gauge,
  Printer,
  ScanLine,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Trophy,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react'
import { getMenuPermissionForPath } from '@/features/authz/data/permission-catalog'
import type { TranslationKey } from '@/locales'
import type { SidebarData } from '../types'

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

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

const permissionIdForPath = (path: string): string => getMenuPermissionForPath(path)

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
      {
        titleKey: 'sidebar.items.salesManagement',
        url: '/trading',
        icon: ShoppingBag,
        permissionId: permissionIdForPath('/trading'),
      },
      {
        titleKey: 'sidebar.items.mrp',
        url: '/mrp',
        icon: Gauge,
        permissionId: permissionIdForPath('/mrp'),
      },
      {
        titleKey: 'sidebar.items.purchaseManagement',
        url: '/purchase',
        icon: Truck,
        permissionId: permissionIdForPath('/purchase'),
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
    ],
  },
  {
    titleKey: 'sidebar.groups.serviceCenter',
    items: [
      {
        titleKey: 'sidebar.items.leaveManagement',
        url: '/personnel/leave',
        icon: Calendar,
        permissionId: permissionIdForPath('/personnel/leave'),
      },
      {
        titleKey: 'sidebar.items.hallOfFame',
        url: '/personnel/stats',
        icon: Trophy,
        permissionId: permissionIdForPath('/personnel/stats'),
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
        titleKey: 'sidebar.items.printCenter',
        url: '/print-mgmt',
        icon: Printer,
        permissionId: permissionIdForPath('/print-mgmt'),
      },
      {
        titleKey: 'sidebar.items.terminalConfig',
        url: '/terminal-config',
        icon: ScanLine,
        permissionId: permissionIdForPath('/terminal-config'),
      },
      {
        titleKey: 'sidebar.items.systemManagement',
        url: '/system-management/routing',
        icon: ShieldCheck,
        permissionId: permissionIdForPath('/system-management/routing'),
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
      {
        titleKey: 'sidebar.items.financeCenter',
        url: '/finance-management',
        icon: Scale,
        permissionId: permissionIdForPath('/finance-management'),
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
          title: '销售管理',
          url: '/trading',
          icon: ShoppingBag,
          permissionId: permissionIdForPath('/trading'),
        },
        { title: '采购管理', url: '/purchase', icon: Truck, permissionId: permissionIdForPath('/purchase') },
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
        { title: '品质审计', url: '/quality', icon: Scale, permissionId: permissionIdForPath('/quality') },
      ],
    },
    {
      title: '仓储',
      items: [
        { title: '仓储作业', url: '/warehouse', icon: Warehouse, permissionId: permissionIdForPath('/warehouse') },
        { title: '物料档案', url: '/materials', icon: Database, permissionId: permissionIdForPath('/materials') },
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
        { title: '炉台资产档案', url: '/furnaces', icon: Gauge, permissionId: permissionIdForPath('/furnaces') },
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
        { title: '人事账号中心', url: '/personnel', icon: Users, permissionId: permissionIdForPath('/personnel') },
        { title: '打印中心', url: '/print-mgmt', icon: Printer, permissionId: permissionIdForPath('/print-mgmt') },
        {
          title: '终端配置',
          url: '/terminal-config',
          icon: ScanLine,
          permissionId: permissionIdForPath('/terminal-config'),
        },
        {
          title: '系统管理',
          url: '/system-management/routing',
          icon: ShieldCheck,
          permissionId: permissionIdForPath('/system-management/routing'),
        },
        { title: '审批中心', url: '/approval', icon: ShieldCheck, permissionId: permissionIdForPath('/approval') },
        {
          title: '基础配置',
          url: '/basic-settings',
          icon: Sliders,
          permissionId: permissionIdForPath('/basic-settings'),
        },
        {
          title: '财务中心',
          url: '/finance-management',
          icon: Scale,
          permissionId: permissionIdForPath('/finance-management'),
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
