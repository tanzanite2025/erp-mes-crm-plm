import type { ElementType } from 'react'
import { type TranslationKey } from '@/locales'
import { Layout, PlusCircle } from 'lucide-react'
import {
  ENABLED_QUICK_ACTION_IDS,
  QUICK_ACTION_DEFINITIONS,
} from './quick-action-registry'

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

export interface KnowledgeRouteOption {
  value: string
  label: string
  parentLabel: string
}

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

type CommandItemConfig = {
  id: string
  href: string
  titleKey: TranslationKey
  parentKey: TranslationKey
  keywords?: string[]
  pinyin?: string
  enabled?: boolean
}

export const ENABLED_ACTION_RESULT_IDS: string[] = [...ENABLED_QUICK_ACTION_IDS]

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
    keywords: ['user', 'permission', 'rights', '授权', '用户权限'],
    pinyin: 'yhqx',
  },
  {
    id: 'tab-production-architecture-line',
    href: '/production-architecture/line',
    titleKey: 'commandMenu.items.productionLines',
    parentKey: 'commandMenu.parents.productionCoordination',
    keywords: ['line', 'production', '产线'],
    pinyin: 'cxgl',
  },
  {
    id: 'tab-production-architecture-topology',
    href: '/production-architecture/topology',
    titleKey: 'commandMenu.items.topology',
    parentKey: 'commandMenu.parents.productionCoordination',
    keywords: ['topology', 'template', '拓扑'],
    pinyin: 'tpmb',
  },
  {
    id: 'tab-service-leave-management',
    href: '/leave-management',
    titleKey: 'commandMenu.items.leaveManagement',
    parentKey: 'commandMenu.items.hallOfFame',
    keywords: ['leave', 'vacation', '请假'],
    pinyin: 'qjgl',
  },
  {
    id: 'tab-service-hall-of-fame',
    href: '/hall-of-fame',
    titleKey: 'orgPersonnel.tabs.stats',
    parentKey: 'commandMenu.items.hallOfFame',
    keywords: ['honor', 'ranking', '荣誉榜', '优秀员工榜'],
    pinyin: 'ryb',
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
    id: 'tab-warehouse-config-packaging-assembly',
    href: '/warehouse-config/packaging-assembly',
    titleKey: 'commandMenu.items.packagingAssembly',
    parentKey: 'commandMenu.items.warehouseConfig',
    keywords: ['warehouse', 'packaging', 'assembly', '装箱组装'],
    pinyin: 'zxzz',
  },
  {
    id: 'tab-warehouse-config-category',
    href: '/warehouse-config/category',
    titleKey: 'commandMenu.items.warehouseCategory',
    parentKey: 'commandMenu.items.warehouseConfig',
    keywords: ['warehouse', 'category', '仓库基础配置', '仓库分类'],
    pinyin: 'ckjc',
  },
  {
    id: 'tab-trading-customers',
    href: '/trading/customers',
    titleKey: 'trading.tabs.customers',
    parentKey: 'commandMenu.parents.salesManagement',
    keywords: ['customer', '客户'],
    pinyin: 'khgl',
  },
  {
    id: 'tab-quotes-management',
    href: '/quotes/orders',
    titleKey: 'commandMenu.items.quoteManagement',
    parentKey: 'commandMenu.parents.quoteManagement',
    keywords: ['quote', 'quotation', '报价'],
    pinyin: 'bjgl',
  },
  {
    id: 'tab-trading-sales-orders',
    href: '/trading/sales-orders',
    titleKey: 'trading.tabs.salesOrders',
    parentKey: 'commandMenu.parents.salesManagement',
    keywords: ['sales', 'order', '销售订单'],
    pinyin: 'xsdd',
  },
  {
    id: 'tab-mrp-requirements',
    href: '/mrp/requirements',
    titleKey: 'mrp.tabs.requirements',
    parentKey: 'commandMenu.parents.mrp',
    keywords: ['requirements', 'part', 'mrp', '料号需求'],
    pinyin: 'lhxq',
  },
  {
    id: 'tab-shipping-logistics',
    href: '/shipping-management/logistics',
    titleKey: 'trading.shippingManagement.tabs.logistics',
    parentKey: 'sidebar.items.shippingManagement',
    keywords: ['logistics', '物流'],
    pinyin: 'wlgl',
  },
  {
    id: 'tab-sales-analysis',
    href: '/sales-analysis',
    titleKey: 'commandMenu.items.salesAnalysis',
    parentKey: 'commandMenu.parents.salesManagement',
    keywords: ['analysis', 'sales analysis', 'orders', '订单分析', '销售分析'],
    pinyin: 'xsfx',
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
    keywords: ['usb', 'scanner', 'barcode', 'USB扫码配置', '扫码枪', 'hid'],
    pinyin: 'usbsmpz',
  },
  {
    id: 'tab-terminal-mobile-capture',
    href: '/terminal-config/mobile-capture',
    titleKey: 'commandMenu.items.terminalMobileCapture',
    parentKey: 'commandMenu.parents.terminalConfig',
    keywords: ['mobile', 'camera', 'capture', 'phone', '移动采集', '手机扫码'],
    pinyin: 'ydcj',
  },
  {
    id: 'tab-code-center-shared-numbering-engine',
    href: '/code-center/shared-code-source/numbering-engine',
    titleKey: 'commandMenu.items.sharedNumberingEngine',
    parentKey: 'commandMenu.parents.codeCenter',
    keywords: [
      'shared',
      'numbering',
      'engine',
      'barcode',
      'dm',
      'dm码',
      'dm号码',
      '发号',
      '编号',
      '业务编号',
      '规则',
    ],
    pinyin: 'gxfhqy',
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
    id: 'tab-message-center-rules',
    href: '/message-center/rules',
    titleKey: 'messageCenter.pages.rules.title',
    parentKey: 'commandMenu.parents.messageAndApproval',
    keywords: ['message center', 'rules', '通知监听规则', '消息中心'],
    pinyin: 'xxzxgz',
  },
  {
    id: 'tab-message-center-sources',
    href: '/message-center/sources',
    titleKey: 'messageCenter.pages.sources.title',
    parentKey: 'commandMenu.parents.messageAndApproval',
    keywords: ['message center', 'sources', '业务事件源', '消息中心'],
    pinyin: 'xxzxsjy',
  },
  {
    id: 'tab-message-center-templates',
    href: '/message-center/templates',
    titleKey: 'messageCenter.pages.templates.title',
    parentKey: 'commandMenu.parents.messageAndApproval',
    keywords: ['message center', 'templates', '通知内容模板', '消息中心'],
    pinyin: 'xxzxmb',
  },
  {
    id: 'tab-message-center-executions',
    href: '/message-center/executions',
    titleKey: 'messageCenter.pages.executions.title',
    parentKey: 'commandMenu.parents.messageAndApproval',
    keywords: ['message center', 'executions', '执行日志', '消息中心'],
    pinyin: 'xxzxzxrz',
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
    parentKey: 'commandMenu.parents.qualityStandards',
    keywords: ['quality', 'standards', '标准'],
    pinyin: 'pzjybz',
  },
  {
    id: 'tab-quality-abnormalities',
    href: '/production-quality/abnormalities',
    titleKey: 'commandMenu.items.qualityAbnormalities',
    parentKey: 'commandMenu.parents.qualityOperations',
    keywords: ['quality', 'abnormality', 'handling', '异常'],
    pinyin: 'yccz',
  },
  {
    id: 'tab-quality-inspection',
    href: '/production-quality/inspection',
    titleKey: 'commandMenu.items.qualityInspection',
    parentKey: 'commandMenu.parents.qualityOperations',
    keywords: ['inspection', 'execution', '检验'],
    pinyin: 'jyzx',
  },
  {
    id: 'tab-quality-special-buy',
    href: '/production-quality/special-buy',
    titleKey: 'commandMenu.items.qualitySpecialBuy',
    parentKey: 'commandMenu.parents.qualityOperations',
    keywords: ['special', 'acceptance', 'release', '特采'],
    pinyin: 'tcfx',
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
    id: 'tab-cutting-database',
    href: '/raw-materials',
    titleKey: 'commandMenu.items.cuttingDatabase',
    parentKey: 'commandMenu.parents.rawMaterialsManagement',
    keywords: [
      'cutting database',
      'raw materials',
      'raw material management',
      '裁纱数据库',
      '原材料管理',
    ],
    pinyin: 'cssjk',
  },
  {
    id: 'tab-prepreg-catalog',
    href: '/raw-materials/catalog',
    titleKey: 'commandMenu.items.prepregCatalog',
    parentKey: 'commandMenu.parents.rawMaterialsManagement',
    keywords: [
      'prepreg',
      'prepreg catalog',
      'roll spec',
      '预浸料',
      '预浸料目录',
    ],
    pinyin: 'yjl',
  },
  {
    id: 'tab-cutting-simulation',
    href: '/raw-materials-engine/cutting-simulation',
    titleKey: 'commandMenu.items.batchEngine',
    parentKey: 'sidebar.items.cuttingEngine',
    keywords: [
      'cutting simulation',
      'cutting preview',
      'cutting engine',
      '裁切模拟',
      '裁切预演',
      '裁纱引擎',
    ],
    pinyin: 'cqmn',
  },
  {
    id: 'tab-cut-size-library',
    href: '/raw-materials/cut-size-library',
    titleKey: 'commandMenu.items.cutSizeLibrary',
    parentKey: 'commandMenu.parents.rawMaterialsManagement',
    keywords: [
      'cut size library',
      'cutting size library',
      'size unit',
      '裁切尺寸库',
      '尺寸单元',
    ],
    pinyin: 'cqcck',
  },
  {
    id: 'tab-cutting-plan',
    href: '/raw-materials/cutting-plan',
    titleKey: 'commandMenu.items.cuttingPlan',
    parentKey: 'commandMenu.parents.rawMaterialsManagement',
    keywords: [
      'cutting plan',
      'cut plan',
      'cutting sheet',
      '裁纱方案',
      '裁纱单',
    ],
    pinyin: 'csfa',
  },
  {
    id: 'tab-cutting-operations',
    href: '/cutting-operations/cutting-issuance',
    titleKey: 'commandMenu.items.cuttingOperations',
    parentKey: 'commandMenu.parents.rawMaterialsManagement',
    keywords: [
      'cutting issuance',
      'cutting operations',
      'execution',
      '裁纱作业',
      '裁纱下达',
    ],
    pinyin: 'cszy',
  },
  {
    id: 'tab-cutting-size-inventory',
    href: '/cutting-operations/size-inventory',
    titleKey: 'commandMenu.items.cuttingSizeInventory',
    parentKey: 'commandMenu.parents.rawMaterialsManagement',
    keywords: [
      'cutting size inventory',
      'size inventory',
      'cut-size library',
      '裁纱尺寸库存',
      '尺寸库存',
      '裁切尺寸库',
    ],
    pinyin: 'cscsskc',
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

const actionConfigDefinitions: CommandItemConfig[] =
  QUICK_ACTION_DEFINITIONS.map(
    ({ hostKind: _hostKind, successHref: _successHref, ...config }) => config
  )

const actionConfigs: CommandItemConfig[] = actionConfigDefinitions.map(
  (config): CommandItemConfig => ({
    ...config,
    enabled: ENABLED_ACTION_RESULT_IDS.includes(config.id),
  })
)

export const STATIC_SEARCH_RESULT_REGISTRY = {
  modules: moduleGroups,
  actions: actionConfigs,
} as const

function buildKeywords(
  t: TranslateFn,
  titleKey: TranslationKey,
  parentKey: TranslationKey,
  extraKeywords: string[] = []
) {
  return [t(titleKey), t(parentKey), ...extraKeywords]
}

function getEnabledConfigs(configs: readonly CommandItemConfig[]) {
  return configs.filter((config) => config.enabled !== false)
}

function toSearchItem(
  t: TranslateFn,
  config: CommandItemConfig,
  category: SearchCategory,
  icon: ElementType
): SearchItem {
  return {
    id: config.id,
    title: t(config.titleKey),
    href: config.href,
    category,
    icon,
    parentTitle: t(config.parentKey),
    keywords: buildKeywords(
      t,
      config.titleKey,
      config.parentKey,
      config.keywords
    ),
    pinyin: config.pinyin || '',
  }
}

function getTabItems(t: TranslateFn): SearchItem[] {
  return getEnabledConfigs(STATIC_SEARCH_RESULT_REGISTRY.modules).map(
    (config) => toSearchItem(t, config, 'modules', Layout)
  )
}

function getActionItems(t: TranslateFn): SearchItem[] {
  return getEnabledConfigs(STATIC_SEARCH_RESULT_REGISTRY.actions).map(
    (config) => toSearchItem(t, config, 'actions', PlusCircle)
  )
}

export function getKnowledgeRouteOptions(
  t: TranslateFn
): KnowledgeRouteOption[] {
  return getEnabledConfigs(STATIC_SEARCH_RESULT_REGISTRY.modules).map(
    (config) => ({
      value: config.href,
      label: t(config.titleKey),
      parentLabel: t(config.parentKey),
    })
  )
}

export function getSearchItems(t: TranslateFn): SearchItem[] {
  return [...getTabItems(t), ...getActionItems(t)]
}
