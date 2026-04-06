import { ArrowRight, Compass, Layout, PlusCircle } from 'lucide-react'
import type { ElementType } from 'react'
import { type TranslationKey } from '@/locales'
import { getSidebarData } from './sidebar-data'

export type SearchCategory = 'navigation' | 'modules' | 'actions' | 'data'

export interface SearchItem {
  id: string
  title: string
  href: string
  category: SearchCategory
  icon?: ElementType
  keywords?: string[]
  parentTitle?: string
  pinyin?: string
}

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string

type SearchConfig = {
  titleKey: TranslationKey
  parentKey: TranslationKey
  keywords?: string[]
  pinyin?: string
}

type CommandItemConfig = {
  id: string
  href: string
  titleKey: TranslationKey
  parentKey: TranslationKey
  keywords?: string[]
  pinyin?: string
}

const navigationConfigs: Record<string, SearchConfig> = {
  '/dashboard/overview': {
    titleKey: 'commandMenu.items.dashboard',
    parentKey: 'commandMenu.parents.resourceManagement',
    keywords: ['dashboard', 'overview', '仪表盘'],
    pinyin: 'ybp',
  },
  '/warehouse': {
    titleKey: 'commandMenu.items.warehouse',
    parentKey: 'commandMenu.parents.resourceManagement',
    keywords: ['warehouse', 'stock', '仓储'],
    pinyin: 'ck',
  },
  '/trading': {
    titleKey: 'commandMenu.items.trading',
    parentKey: 'commandMenu.parents.resourceManagement',
    keywords: ['trading', 'sales', 'purchase', '贸销'],
    pinyin: 'mxgl',
  },
  '/purchase': {
    titleKey: 'commandMenu.items.purchase',
    parentKey: 'commandMenu.parents.resourceManagement',
    keywords: ['purchase', 'procurement', '采购'],
    pinyin: 'cggl',
  },
  '/engineering': {
    titleKey: 'commandMenu.items.engineering',
    parentKey: 'commandMenu.parents.engineeringManagement',
    keywords: ['engineering', 'product', '工程'],
    pinyin: 'gcgl',
  },
  '/materials': {
    titleKey: 'commandMenu.items.materialArchive',
    parentKey: 'commandMenu.parents.engineeringManagement',
    keywords: ['material', 'archive', 'master', '物料'],
    pinyin: 'wlda',
  },
  '/engineering-db': {
    titleKey: 'commandMenu.items.engineeringDb',
    parentKey: 'commandMenu.parents.engineeringManagement',
    keywords: ['engineering', 'database', '工程数据库'],
    pinyin: 'gcsjk',
  },
  '/quality': {
    titleKey: 'commandMenu.items.quality',
    parentKey: 'commandMenu.parents.engineeringManagement',
    keywords: ['quality', 'audit', 'inspection', '品质', '质检', '审计'],
    pinyin: 'pzsj',
  },
  '/piecework': {
    titleKey: 'commandMenu.items.piecework',
    parentKey: 'commandMenu.parents.productionCoordination',
    keywords: ['piecework', '计件'],
    pinyin: 'jjgl',
  },
  '/equipment-tooling/overview': {
    titleKey: 'commandMenu.items.toolingAssets',
    parentKey: 'commandMenu.parents.toolingManagement',
    keywords: ['tooling', 'mold', '模具'],
    pinyin: 'mjzc',
  },
  '/furnaces': {
    titleKey: 'commandMenu.items.furnaces',
    parentKey: 'commandMenu.parents.toolingManagement',
    keywords: ['furnace', '炉台'],
    pinyin: 'ltzc',
  },
  '/personnel': {
    titleKey: 'commandMenu.items.personnel',
    parentKey: 'commandMenu.parents.systemSettings',
    keywords: ['personnel', 'accounts', '人事'],
    pinyin: 'rszh',
  },
  '/print-mgmt': {
    titleKey: 'commandMenu.items.printMgmt',
    parentKey: 'commandMenu.parents.systemSettings',
    keywords: ['print', 'label', '打印'],
    pinyin: 'dyzx',
  },
  '/terminal-config': {
    titleKey: 'commandMenu.items.terminalConfig',
    parentKey: 'commandMenu.parents.systemSettings',
    keywords: ['terminal', 'scanner', 'printer', 'pda', '终端配置'],
    pinyin: 'zdpz',
  },
  '/system-management/routing': {
    titleKey: 'commandMenu.items.systemManagement',
    parentKey: 'commandMenu.parents.systemSettings',
    keywords: ['system', 'management', '系统'],
    pinyin: 'xtgl',
  },
  '/approval': {
    titleKey: 'commandMenu.items.approval',
    parentKey: 'commandMenu.parents.systemSettings',
    keywords: ['approval', 'workflow', '审批'],
    pinyin: 'spzx',
  },
  '/basic-settings': {
    titleKey: 'commandMenu.items.basicSettings',
    parentKey: 'commandMenu.parents.systemSettings',
    keywords: ['settings', 'config', '基础配置'],
    pinyin: 'jcpz',
  },
  '/finance-management': {
    titleKey: 'commandMenu.items.finance',
    parentKey: 'commandMenu.parents.systemSettings',
    keywords: ['finance', '财务'],
    pinyin: 'cwzx',
  },
}

const moduleGroups: CommandItemConfig[] = [
  {
    id: 'tab-personnel-org',
    href: '/personnel/org',
    titleKey: 'commandMenu.items.orgStructure',
    parentKey: 'commandMenu.parents.orgPersonnelCenter',
    keywords: ['org', 'structure', '组织'],
    pinyin: 'zzjg',
  },
  {
    id: 'tab-personnel-employees',
    href: '/personnel/employees',
    titleKey: 'commandMenu.items.employees',
    parentKey: 'commandMenu.parents.orgPersonnelCenter',
    keywords: ['employee', 'staff', '员工'],
    pinyin: 'rygl',
  },
  {
    id: 'tab-personnel-accounts',
    href: '/personnel/accounts',
    titleKey: 'commandMenu.items.accounts',
    parentKey: 'commandMenu.parents.orgPersonnelCenter',
    keywords: ['account', 'accounts', '账户'],
    pinyin: 'zhlb',
  },
  {
    id: 'tab-personnel-rights',
    href: '/personnel/rights',
    titleKey: 'commandMenu.items.rights',
    parentKey: 'commandMenu.parents.orgPersonnelCenter',
    keywords: ['role', 'rights', '角色'],
    pinyin: 'jsqx',
  },
  {
    id: 'tab-personnel-permissions',
    href: '/personnel/permissions',
    titleKey: 'commandMenu.items.permissions',
    parentKey: 'commandMenu.parents.orgPersonnelCenter',
    keywords: ['permission', 'audit', '权限'],
    pinyin: 'qxsj',
  },
  {
    id: 'tab-personnel-line',
    href: '/personnel/line',
    titleKey: 'commandMenu.items.productionLines',
    parentKey: 'commandMenu.parents.orgPersonnelCenter',
    keywords: ['line', 'production', '产线'],
    pinyin: 'cxgl',
  },
  {
    id: 'tab-personnel-topology',
    href: '/personnel/topology',
    titleKey: 'commandMenu.items.topology',
    parentKey: 'commandMenu.parents.orgPersonnelCenter',
    keywords: ['topology', 'template', '拓扑'],
    pinyin: 'tpmb',
  },
  {
    id: 'tab-warehouse-stock',
    href: '/warehouse',
    titleKey: 'commandMenu.items.stock',
    parentKey: 'commandMenu.parents.warehouse',
    keywords: ['stock', 'inventory', '库存'],
    pinyin: 'kcqd',
  },
  {
    id: 'tab-warehouse-reports',
    href: '/warehouse/reports',
    titleKey: 'commandMenu.items.reports',
    parentKey: 'commandMenu.parents.warehouse',
    keywords: ['reports', '报表'],
    pinyin: 'bb',
  },
  {
    id: 'tab-warehouse-inbound',
    href: '/warehouse/inbound',
    titleKey: 'commandMenu.items.inbound',
    parentKey: 'commandMenu.parents.warehouse',
    keywords: ['inbound', '入库'],
    pinyin: 'cprk',
  },
  {
    id: 'tab-warehouse-shipment',
    href: '/warehouse/shipment',
    titleKey: 'commandMenu.items.shipment',
    parentKey: 'commandMenu.parents.warehouse',
    keywords: ['shipment', 'outbound', '出货'],
    pinyin: 'cpch',
  },
  {
    id: 'tab-warehouse-category',
    href: '/warehouse/category',
    titleKey: 'commandMenu.items.warehouseCategory',
    parentKey: 'commandMenu.parents.warehouse',
    keywords: ['warehouse', 'category', '仓库分类'],
    pinyin: 'ckfl',
  },
  {
    id: 'tab-warehouse-stocktake',
    href: '/warehouse/stocktake',
    titleKey: 'commandMenu.items.stocktake',
    parentKey: 'commandMenu.parents.warehouse',
    keywords: ['stocktake', '盘点'],
    pinyin: 'wlpd',
  },
  {
    id: 'tab-warehouse-adjustments',
    href: '/warehouse/adjustments',
    titleKey: 'commandMenu.items.adjustments',
    parentKey: 'commandMenu.parents.warehouse',
    keywords: ['adjustment', 'record', '调账'],
    pinyin: 'tzjl',
  },
  {
    id: 'tab-trading-customers',
    href: '/trading/customers',
    titleKey: 'trading.tabs.customers',
    parentKey: 'commandMenu.parents.trading',
    keywords: ['customer', '客户'],
    pinyin: 'khgl',
  },
  {
    id: 'tab-trading-sales-orders',
    href: '/trading/sales-orders',
    titleKey: 'trading.tabs.salesOrders',
    parentKey: 'commandMenu.parents.trading',
    keywords: ['sales', 'order', '销售订单'],
    pinyin: 'xsdd',
  },
  {
    id: 'tab-trading-requirements',
    href: '/trading/requirements',
    titleKey: 'trading.tabs.requirements',
    parentKey: 'commandMenu.parents.trading',
    keywords: ['requirements', 'part', '料号需求'],
    pinyin: 'lhxq',
  },
  {
    id: 'tab-trading-logistics',
    href: '/trading/logistics',
    titleKey: 'trading.tabs.logistics',
    parentKey: 'commandMenu.parents.trading',
    keywords: ['logistics', '物流'],
    pinyin: 'wlgl',
  },
  {
    id: 'tab-terminal-printers',
    href: '/terminal-config/printers',
    titleKey: 'commandMenu.items.terminalPrinters',
    parentKey: 'commandMenu.parents.terminalConfig',
    keywords: ['printer', 'driver', '打印机驱动'],
    pinyin: 'dyjqd',
  },
  {
    id: 'tab-terminal-pda',
    href: '/terminal-config/pda',
    titleKey: 'commandMenu.items.terminalPda',
    parentKey: 'commandMenu.parents.terminalConfig',
    keywords: ['pda', 'terminal', 'PDA终端'],
    pinyin: 'pdazd',
  },
  {
    id: 'tab-terminal-scanners',
    href: '/terminal-config/scanners',
    titleKey: 'commandMenu.items.terminalScanners',
    parentKey: 'commandMenu.parents.terminalConfig',
    keywords: ['scanner', 'barcode', '扫码设备'],
    pinyin: 'smsb',
  },
  {
    id: 'tab-terminal-downloads',
    href: '/terminal-config/downloads',
    titleKey: 'commandMenu.items.terminalDownloads',
    parentKey: 'commandMenu.parents.terminalConfig',
    keywords: ['download', 'driver', '驱动下载'],
    pinyin: 'qdxz',
  },
  {
    id: 'tab-terminal-guides',
    href: '/terminal-config/guides',
    titleKey: 'commandMenu.items.terminalGuides',
    parentKey: 'commandMenu.parents.terminalConfig',
    keywords: ['guide', 'install', '安装说明'],
    pinyin: 'azsm',
  },
  {
    id: 'tab-basic-dm-numbering',
    href: '/basic-settings/dm-numbering',
    titleKey: 'commandMenu.items.dmNumbering',
    parentKey: 'commandMenu.parents.basicSettings',
    keywords: ['dm', 'numbering', '编码'],
    pinyin: 'dmhm',
  },
  {
    id: 'tab-basic-units',
    href: '/basic-settings/units',
    titleKey: 'commandMenu.items.units',
    parentKey: 'commandMenu.parents.basicSettings',
    keywords: ['unit', '单位'],
    pinyin: 'dwgl',
  },
  {
    id: 'tab-basic-sequences',
    href: '/basic-settings/sequences',
    titleKey: 'commandMenu.items.sequences',
    parentKey: 'commandMenu.parents.basicSettings',
    keywords: ['sequence', 'number', '编号'],
    pinyin: 'ywbh',
  },
  {
    id: 'tab-basic-dictionary',
    href: '/basic-settings/dictionary',
    titleKey: 'commandMenu.items.dictionary',
    parentKey: 'commandMenu.parents.basicSettings',
    keywords: ['dictionary', 'parameter', '参数'],
    pinyin: 'cszd',
  },
  {
    id: 'tab-basic-enterprise',
    href: '/basic-settings/enterprise',
    titleKey: 'commandMenu.items.enterprise',
    parentKey: 'commandMenu.parents.basicSettings',
    keywords: ['enterprise', 'company', '企业'],
    pinyin: 'qyxx',
  },
  {
    id: 'tab-basic-security',
    href: '/basic-settings/security',
    titleKey: 'commandMenu.items.security',
    parentKey: 'commandMenu.parents.basicSettings',
    keywords: ['security', '安全'],
    pinyin: 'aqsz',
  },
  {
    id: 'tab-engineering-products',
    href: '/engineering/products',
    titleKey: 'commandMenu.items.engineeringProducts',
    parentKey: 'commandMenu.parents.engineering',
    keywords: ['product', 'engineering', '型号'],
    pinyin: 'cpgcxh',
  },
  {
    id: 'tab-engineering-bom',
    href: '/engineering/bom',
    titleKey: 'commandMenu.items.engineeringBom',
    parentKey: 'commandMenu.parents.engineering',
    keywords: ['bom', 'formula', '物料配方'],
    pinyin: 'bomwlpf',
  },
  {
    id: 'tab-engineering-templates',
    href: '/engineering/templates',
    titleKey: 'commandMenu.items.engineeringTemplates',
    parentKey: 'commandMenu.parents.engineering',
    keywords: ['template', 'product', '模板'],
    pinyin: 'cpmb',
  },
  {
    id: 'tab-quality-standards',
    href: '/quality/standards',
    titleKey: 'commandMenu.items.qualityStandards',
    parentKey: 'commandMenu.parents.quality',
    keywords: ['quality', 'standards', '标准'],
    pinyin: 'pzjybz',
  },
  {
    id: 'tab-quality-abnormalities',
    href: '/quality/abnormalities',
    titleKey: 'commandMenu.items.qualityAbnormalities',
    parentKey: 'commandMenu.parents.quality',
    keywords: ['quality', 'alert', '异常'],
    pinyin: 'pzycyj',
  },
  {
    id: 'tab-quality-inspection',
    href: '/quality/inspection',
    titleKey: 'commandMenu.items.qualityInspection',
    parentKey: 'commandMenu.parents.quality',
    keywords: ['inspection', 'task', '检验'],
    pinyin: 'cpjyrw',
  },
  {
    id: 'tab-materials',
    href: '/materials',
    titleKey: 'commandMenu.items.materialArchive',
    parentKey: 'commandMenu.parents.materialArchive',
    keywords: ['material', 'master', 'archive', '物料主数据'],
    pinyin: 'wlzsj',
  },
  {
    id: 'tab-experimental-equipment',
    href: '/labs/experimental/equipment',
    titleKey: 'commandMenu.items.experimentalEquipmentArchive',
    parentKey: 'commandMenu.parents.experimental',
    keywords: ['lab', 'laboratory', 'equipment', '实验设备'],
    pinyin: 'sysbda',
  },
  {
    id: 'tab-experimental-tests',
    href: '/labs/experimental/tests',
    titleKey: 'commandMenu.items.experimentalProjects',
    parentKey: 'commandMenu.parents.experimental',
    keywords: ['lab', 'laboratory', 'project', '测试'],
    pinyin: 'syxm',
  },
  {
    id: 'tab-experimental-reports',
    href: '/labs/experimental/reports',
    titleKey: 'commandMenu.items.experimentalReportArchive',
    parentKey: 'commandMenu.parents.experimental',
    keywords: ['lab', 'laboratory', 'report', '实验报告'],
    pinyin: 'sybgda',
  },
]

const actionConfigs: CommandItemConfig[] = [
  {
    id: 'action-add-employee',
    href: '/personnel/employees?action=add',
    titleKey: 'commandMenu.items.addEmployee',
    parentKey: 'commandMenu.parents.employeeManagement',
    keywords: ['employee', 'staff', 'add', '新增员工'],
    pinyin: 'xzry',
  },
  {
    id: 'action-inbound',
    href: '/warehouse/inbound?action=add',
    titleKey: 'commandMenu.items.inboundAction',
    parentKey: 'commandMenu.parents.warehouse',
    keywords: ['inbound', 'action', 'product', '产品入库操作'],
    pinyin: 'cprkcz',
  },
]

function buildKeywords(
  t: TranslateFn,
  titleKey: TranslationKey,
  parentKey: TranslationKey,
  extraKeywords: string[] = [],
) {
  return [t(titleKey), t(parentKey), ...extraKeywords]
}

function toSearchItem(
  t: TranslateFn,
  config: CommandItemConfig,
  category: SearchCategory,
  icon: ElementType,
): SearchItem {
  return {
    id: config.id,
    title: t(config.titleKey),
    href: config.href,
    category,
    icon,
    parentTitle: t(config.parentKey),
    keywords: buildKeywords(t, config.titleKey, config.parentKey, config.keywords),
    pinyin: config.pinyin || '',
  }
}

function getSidebarItems(t: TranslateFn): SearchItem[] {
  const items: SearchItem[] = []
  const localizedSidebarData = getSidebarData(t)

  localizedSidebarData.navGroups.forEach((group) => {
    group.items.forEach((navItem) => {
      if ('url' in navItem && navItem.url) {
        const config = navigationConfigs[String(navItem.url)]
        if (config) {
          items.push({
            id: `nav-${navItem.url}`,
            title: t(config.titleKey),
            href: String(navItem.url),
            category: 'navigation',
            icon: navItem.icon || Compass,
            parentTitle: t(config.parentKey),
            keywords: buildKeywords(t, config.titleKey, config.parentKey, config.keywords),
            pinyin: config.pinyin || '',
          })
        }
      }

      if ('items' in navItem && navItem.items) {
        navItem.items.forEach((subItem) => {
          const config = navigationConfigs[String(subItem.url)]
          if (config) {
            items.push({
              id: `nav-${subItem.url}`,
              title: t(config.titleKey),
              href: String(subItem.url),
              category: 'navigation',
              icon: ArrowRight,
              parentTitle: t(config.parentKey),
              keywords: buildKeywords(t, config.titleKey, config.parentKey, config.keywords),
              pinyin: config.pinyin || '',
            })
          }
        })
      }
    })
  })

  return items
}

function getTabItems(t: TranslateFn): SearchItem[] {
  return moduleGroups.map((config) => toSearchItem(t, config, 'modules', Layout))
}

function getActionItems(t: TranslateFn): SearchItem[] {
  return actionConfigs.map((config) => toSearchItem(t, config, 'actions', PlusCircle))
}

export function getSearchItems(t: TranslateFn): SearchItem[] {
  return [...getSidebarItems(t), ...getTabItems(t), ...getActionItems(t)]
}
