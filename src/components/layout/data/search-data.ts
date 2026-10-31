import type { ElementType } from 'react'
import { type TranslationKey } from '@/locales'
import { PlusCircle } from 'lucide-react'
import { buildGlobalSearchNavigationItems } from './global-search-navigation-catalog'
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

// Legacy search aliases enrich the shared navigation catalog; they do not
// define which pages exist or which destinations are searchable.
type GlobalSearchNavigationKeywordAlias = {
  href: string
  labelKeys: TranslationKey[]
  keywords: string[]
  pinyin: string
}

const moduleSearchKeywordOverrides: GlobalSearchNavigationKeywordAlias[] = [
  {
    href: '/purchase/purchase-operation-guide',
    labelKeys: ['purchase.operationGuide.title'],
    keywords: [
      '采购指南',
      '采购流程',
      '采购下单',
      '收货入库',
      '采购退货',
      '应付付款',
      'purchase guide',
      'purchasing handbook',
    ],
    pinyin: 'cgczzn',
  },
  {
    href: '/trading/sales-operation-guide',
    labelKeys: ['trading.operationGuide.title'],
    keywords: [
      '销售指南',
      '销售流程',
      '销售下单',
      '交付跟进',
      '退换货',
      '应收收款',
      'sales guide',
      'sales handbook',
    ],
    pinyin: 'xsczzn',
  },
  {
    href: '/warehouse/production-material-handovers-guide',
    labelKeys: ['warehouse.productionMaterialHandoversGuide.title'],
    keywords: [
      '生产领退',
      '仓库发料',
      '补料',
      '退料',
      '分批领料',
      'production issue return guide',
    ],
    pinyin: 'scrtczzn',
  },
  {
    href: '/production-outsourcing/task-and-partner-operation-guide',
    labelKeys: ['productionOutsourcing.operationGuides.tasksAndPartners.title'],
    keywords: [
      '委外任务',
      '委外单位',
      '建单',
      '下发',
      'outsourcing task partner guide',
    ],
    pinyin: 'wwrwwwdwczzn',
  },
  {
    href: '/production-outsourcing/send-return-inspection-scanning-guide',
    labelKeys: [
      'productionOutsourcing.operationGuides.sendReturnInspection.title',
    ],
    keywords: [
      '扫码录入',
      '条码登记',
      '发出',
      '回厂',
      '检验',
      'outsourcing scanning guide',
    ],
    pinyin: 'sfjysmzn',
  },
  {
    href: '/personnel/attendance-management-operation-guide',
    labelKeys: [
      'orgPersonnel.attendanceOperationGuide.title',
      'sidebar.groups.orgPersonnelHandbook',
    ],
    keywords: [
      'attendance guide',
      'leave guide',
      '出勤管理操作指南',
      '考勤指南',
      '请假指南',
      '工号匹配',
    ],
    pinyin: 'cqglczzn',
  },
  {
    href: '/personnel/org',
    labelKeys: [
      'commandMenu.items.orgStructure',
      'commandMenu.parents.orgPersonnelCenter',
    ],
    keywords: ['org', 'structure', '组织'],
    pinyin: 'zzjg',
  },
  {
    href: '/personnel/employees',
    labelKeys: [
      'commandMenu.items.employees',
      'commandMenu.parents.orgPersonnelCenter',
    ],
    keywords: ['employee', 'staff', '员工'],
    pinyin: 'rygl',
  },
  {
    href: '/personnel/accounts',
    labelKeys: [
      'commandMenu.items.accounts',
      'commandMenu.parents.orgPersonnelCenter',
    ],
    keywords: ['account', 'accounts', '账户'],
    pinyin: 'zhlb',
  },
  {
    href: '/personnel/rights',
    labelKeys: [
      'commandMenu.items.rights',
      'commandMenu.parents.orgPersonnelCenter',
    ],
    keywords: ['user', 'permission', 'rights', '授权', '用户权限'],
    pinyin: 'yhqx',
  },
  {
    href: '/production-architecture/mindmap',
    labelKeys: [
      'productionArchitecture.layout.tabs.mindmap',
      'commandMenu.parents.productionCoordination',
    ],
    keywords: ['mindmap', 'L1', 'L2', 'L3', '产线脑图', '脑图', '生产结构'],
    pinyin: 'ctxnt',
  },
  {
    href: '/production-architecture/topology',
    labelKeys: [
      'commandMenu.items.topology',
      'commandMenu.parents.productionCoordination',
    ],
    keywords: ['topology', 'template', '拓扑'],
    pinyin: 'tpmb',
  },
  {
    href: '/production-architecture/routes',
    labelKeys: [
      'commandMenu.items.productionRoutes',
      'commandMenu.parents.productionCoordination',
    ],
    keywords: ['production route', 'process route', '路线', '工艺路线'],
    pinyin: 'sclx',
  },
  {
    href: '/production-execution',
    labelKeys: [
      'commandMenu.items.productionExecution',
      'commandMenu.parents.productionCoordination',
    ],
    keywords: [
      'production execution',
      'scan execution',
      'barcode operation',
      '生产执行',
      '生产扫码',
      '工序执行',
    ],
    pinyin: 'sczx',
  },
  {
    href: '/production-outsourcing/orders',
    labelKeys: [
      'productionOutsourcing.layout.tabs.orders',
      'commandMenu.parents.productionCoordination',
    ],
    keywords: ['outsourcing', 'outsource order', '委外', '外协', '委外任务'],
    pinyin: 'wwrw',
  },
  {
    href: '/production-outsourcing/partners',
    labelKeys: [
      'productionOutsourcing.layout.tabs.partners',
      'commandMenu.parents.productionCoordination',
    ],
    keywords: ['outsourcing', 'outsource partner', '委外', '外协', '委外单位'],
    pinyin: 'wwdw',
  },
  {
    href: '/production-outsourcing/transfers',
    labelKeys: [
      'productionOutsourcing.layout.tabs.transfers',
      'commandMenu.parents.productionCoordination',
    ],
    keywords: [
      'outsourcing',
      'outsource transfer',
      'outsource inspection',
      '委外',
      '外协',
      '收发检',
      '回厂检验',
    ],
    pinyin: 'wwsfj',
  },
  {
    href: '/attendance-management/devices',
    labelKeys: [
      'commandMenu.items.attendanceDevices',
      'sidebar.items.attendanceManagement',
    ],
    keywords: [
      'attendance device',
      'clock terminal',
      'ivms',
      'hikvision',
      '考勤设备',
      '打卡机',
      '海康',
    ],
    pinyin: 'kqsb',
  },
  {
    href: '/attendance-management/leave',
    labelKeys: [
      'commandMenu.items.leaveManagement',
      'sidebar.items.attendanceManagement',
    ],
    keywords: ['leave', 'vacation', '请假'],
    pinyin: 'qjgl',
  },
  {
    href: '/attendance-management/hall-of-fame',
    labelKeys: [
      'orgPersonnel.tabs.stats',
      'sidebar.items.attendanceManagement',
    ],
    keywords: ['honor', 'ranking', '荣誉榜', '优秀员工榜'],
    pinyin: 'ryb',
  },
  {
    href: '/warehouse',
    labelKeys: ['commandMenu.items.stock', 'commandMenu.parents.warehouse'],
    keywords: ['stock', 'inventory', '库存'],
    pinyin: 'kcqd',
  },
  {
    href: '/warehouse/reports',
    labelKeys: ['commandMenu.items.reports', 'commandMenu.parents.warehouse'],
    keywords: ['reports', '报表'],
    pinyin: 'bb',
  },
  {
    href: '/warehouse/inbound',
    labelKeys: ['commandMenu.items.inbound', 'commandMenu.parents.warehouse'],
    keywords: ['inbound', '入库'],
    pinyin: 'cprk',
  },
  {
    href: '/warehouse/shipment',
    labelKeys: ['commandMenu.items.shipment', 'commandMenu.parents.warehouse'],
    keywords: ['shipment', 'outbound', '出货'],
    pinyin: 'cpch',
  },
  {
    href: '/warehouse/stocktake',
    labelKeys: ['commandMenu.items.stocktake', 'commandMenu.parents.warehouse'],
    keywords: ['stocktake', 'full inventory', '全库存盘点', '盘点'],
    pinyin: 'qkcpd',
  },
  {
    href: '/warehouse/adjustments',
    labelKeys: [
      'commandMenu.items.adjustments',
      'commandMenu.parents.warehouse',
    ],
    keywords: ['adjustment', 'record', '调账'],
    pinyin: 'tzjl',
  },
  {
    href: '/warehouse-config/packaging-assembly',
    labelKeys: [
      'commandMenu.items.packagingAssembly',
      'commandMenu.items.warehouseConfig',
    ],
    keywords: ['warehouse', 'packaging', 'assembly', '装箱组装'],
    pinyin: 'zxzz',
  },
  {
    href: '/warehouse-config/category',
    labelKeys: [
      'commandMenu.items.warehouseCategory',
      'commandMenu.items.warehouseConfig',
    ],
    keywords: ['warehouse', 'category', '仓库基础配置', '仓库分类'],
    pinyin: 'ckjc',
  },
  {
    href: '/trading/customers',
    labelKeys: [
      'trading.tabs.customers',
      'commandMenu.parents.salesManagement',
    ],
    keywords: ['customer', '客户'],
    pinyin: 'khgl',
  },
  {
    href: '/quotes/orders',
    labelKeys: [
      'commandMenu.items.quoteManagement',
      'commandMenu.parents.quoteManagement',
    ],
    keywords: ['quote', 'quotation', '报价'],
    pinyin: 'bjgl',
  },
  {
    href: '/trading/sales-orders',
    labelKeys: [
      'trading.tabs.salesOrders',
      'commandMenu.parents.salesManagement',
    ],
    keywords: ['sales', 'order', '销售订单'],
    pinyin: 'xsdd',
  },
  {
    href: '/mrp/requirements',
    labelKeys: ['mrp.tabs.requirements', 'commandMenu.parents.mrp'],
    keywords: ['requirements', 'part', 'mrp', '料号需求'],
    pinyin: 'lhxq',
  },
  {
    href: '/shipping-management/logistics',
    labelKeys: [
      'trading.shippingManagement.tabs.logistics',
      'sidebar.items.shippingManagement',
    ],
    keywords: ['logistics', '物流'],
    pinyin: 'wlgl',
  },
  {
    href: '/logistics-loading-specs/container-specs',
    labelKeys: [
      'logisticsContainerManagement.tabs.specs',
      'sidebar.items.loadingSpecs',
    ],
    keywords: ['container', 'shipping container', '货柜', '集装箱', '柜型'],
    pinyin: 'hggg',
  },
  {
    href: '/logistics-loading-specs/vehicle-specs-library',
    labelKeys: [
      'logisticsConfig.tabs.vehicleSpecsLibrary',
      'sidebar.items.loadingSpecs',
    ],
    keywords: ['vehicle', 'vehicle specs', '车型', '车型规格', '车辆规格'],
    pinyin: 'cxggk',
  },
  {
    href: '/business-analysis/production-capacity',
    labelKeys: [
      'businessAnalysis.tabs.productionCapacity',
      'sidebar.groups.analysisAggregation',
    ],
    keywords: ['capacity', 'monthly capacity', '产能', '月产能'],
    pinyin: 'yncn',
  },
  {
    href: '/business-analysis/scrap',
    labelKeys: [
      'businessAnalysis.tabs.scrap',
      'sidebar.groups.analysisAggregation',
    ],
    keywords: ['scrap', 'quality', '报废', '品质分析'],
    pinyin: 'bffx',
  },
  {
    href: '/business-analysis/orders',
    labelKeys: [
      'businessAnalysis.tabs.orders',
      'sidebar.groups.analysisAggregation',
    ],
    keywords: ['orders', 'customer', 'sales', '订单', '客户', '销售分析'],
    pinyin: 'ddfx',
  },
  {
    href: '/terminal-config/pda',
    labelKeys: [
      'commandMenu.items.terminalPda',
      'commandMenu.parents.terminalConfig',
    ],
    keywords: ['pda', 'terminal', 'PDA终端'],
    pinyin: 'pdazd',
  },
  {
    href: '/terminal-config/scanners',
    labelKeys: [
      'commandMenu.items.terminalScanners',
      'commandMenu.parents.terminalConfig',
    ],
    keywords: ['usb', 'scanner', 'barcode', 'USB扫码配置', '扫码枪', 'hid'],
    pinyin: 'usbsmpz',
  },
  {
    href: '/terminal-config/mobile-capture',
    labelKeys: [
      'commandMenu.items.terminalMobileCapture',
      'commandMenu.parents.terminalConfig',
    ],
    keywords: ['mobile', 'camera', 'capture', 'phone', '移动采集', '手机扫码'],
    pinyin: 'ydcj',
  },
  {
    href: '/code-center/linear-barcode/status',
    labelKeys: [
      'codeCenter.linearBarcode.tabs.status',
      'commandMenu.parents.codeCenter',
    ],
    keywords: [
      'linear barcode',
      'barcode state',
      'product barcode state',
      '一维码',
      '一维码状态',
      '产品状态',
      '扫码状态',
      '生产状态',
    ],
    pinyin: 'ywmzt',
  },
  {
    href: '/code-center/shared-code-source/numbering-engine',
    labelKeys: [
      'commandMenu.items.sharedNumberingEngine',
      'commandMenu.parents.codeCenter',
    ],
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
    href: '/basic-settings/units',
    labelKeys: ['commandMenu.items.units', 'commandMenu.parents.basicSettings'],
    keywords: ['unit', '单位'],
    pinyin: 'dwgl',
  },
  {
    href: '/basic-settings/enterprise',
    labelKeys: [
      'commandMenu.items.enterprise',
      'commandMenu.parents.basicSettings',
    ],
    keywords: ['enterprise', 'company', '企业'],
    pinyin: 'qyxx',
  },
  {
    href: '/basic-settings/security',
    labelKeys: [
      'commandMenu.items.security',
      'commandMenu.parents.basicSettings',
    ],
    keywords: ['security', '安全'],
    pinyin: 'aqsz',
  },
  {
    href: '/message-center/rules',
    labelKeys: [
      'messageCenter.pages.rules.title',
      'commandMenu.parents.messageAndApproval',
    ],
    keywords: ['message center', 'rules', '通知监听规则', '消息中心'],
    pinyin: 'xxzxgz',
  },
  {
    href: '/message-center/sources',
    labelKeys: [
      'messageCenter.pages.sources.title',
      'commandMenu.parents.messageAndApproval',
    ],
    keywords: ['message center', 'sources', '业务事件源', '消息中心'],
    pinyin: 'xxzxsjy',
  },
  {
    href: '/message-center/templates',
    labelKeys: [
      'messageCenter.pages.templates.title',
      'commandMenu.parents.messageAndApproval',
    ],
    keywords: ['message center', 'templates', '通知内容模板', '消息中心'],
    pinyin: 'xxzxmb',
  },
  {
    href: '/message-center/executions',
    labelKeys: [
      'messageCenter.pages.executions.title',
      'commandMenu.parents.messageAndApproval',
    ],
    keywords: ['message center', 'executions', '执行日志', '消息中心'],
    pinyin: 'xxzxzxrz',
  },
  {
    href: '/engineering/products',
    labelKeys: [
      'commandMenu.items.engineeringProducts',
      'commandMenu.parents.engineering',
    ],
    keywords: ['product', 'engineering', '型号'],
    pinyin: 'cpgcxh',
  },
  {
    href: '/engineering/bom',
    labelKeys: [
      'commandMenu.items.engineeringBom',
      'commandMenu.parents.engineering',
    ],
    keywords: ['bom', 'formula', '物料配方'],
    pinyin: 'bomwlpf',
  },
  {
    href: '/engineering/templates',
    labelKeys: [
      'commandMenu.items.engineeringTemplates',
      'commandMenu.parents.engineering',
    ],
    keywords: ['template', 'product', '模板'],
    pinyin: 'cpmb',
  },
  {
    href: '/quality/standards',
    labelKeys: [
      'commandMenu.items.qualityStandards',
      'commandMenu.parents.qualityStandards',
    ],
    keywords: ['quality', 'standards', '标准'],
    pinyin: 'pzjybz',
  },
  {
    href: '/production-quality/abnormalities',
    labelKeys: [
      'commandMenu.items.qualityAbnormalities',
      'commandMenu.parents.qualityOperations',
    ],
    keywords: ['quality', 'abnormality', 'handling', '异常'],
    pinyin: 'yccz',
  },
  {
    href: '/production-quality/inspection',
    labelKeys: [
      'commandMenu.items.qualityInspection',
      'commandMenu.parents.qualityOperations',
    ],
    keywords: ['inspection', 'execution', '检验'],
    pinyin: 'jyzx',
  },
  {
    href: '/production-quality/special-buy',
    labelKeys: [
      'commandMenu.items.qualitySpecialBuy',
      'commandMenu.parents.qualityOperations',
    ],
    keywords: ['special', 'acceptance', 'release', '特采'],
    pinyin: 'tcfx',
  },
  {
    href: '/materials',
    labelKeys: [
      'commandMenu.items.materialArchive',
      'commandMenu.parents.materialArchive',
    ],
    keywords: [
      'production materials',
      'material',
      'master',
      'archive',
      '物料主数据',
    ],
    pinyin: 'scwlda wlzsj',
  },
  {
    href: '/materials/all',
    labelKeys: [
      'materialArchive.layout.tabs.all',
      'commandMenu.parents.materialArchive',
    ],
    keywords: ['production materials', '生产物料', '生产用料'],
    pinyin: 'scwl',
  },
  {
    href: '/raw-materials',
    labelKeys: [
      'commandMenu.items.cuttingDatabase',
      'commandMenu.parents.rawMaterialsManagement',
    ],
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
    href: '/raw-materials/catalog',
    labelKeys: [
      'commandMenu.items.prepregCatalog',
      'commandMenu.parents.rawMaterialsManagement',
    ],
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
    href: '/raw-materials-engine/cutting-simulation',
    labelKeys: ['commandMenu.items.batchEngine', 'sidebar.items.cuttingEngine'],
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
    href: '/raw-materials/cut-size-library',
    labelKeys: [
      'commandMenu.items.cutSizeLibrary',
      'commandMenu.parents.rawMaterialsManagement',
    ],
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
    href: '/raw-materials/cutting-plan',
    labelKeys: [
      'commandMenu.items.cuttingPlan',
      'commandMenu.parents.rawMaterialsManagement',
    ],
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
    href: '/cutting-operations/cutting-issuance',
    labelKeys: [
      'commandMenu.items.cuttingOperations',
      'commandMenu.parents.rawMaterialsManagement',
    ],
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
    href: '/cutting-operations/size-inventory',
    labelKeys: [
      'commandMenu.items.cuttingSizeInventory',
      'commandMenu.parents.rawMaterialsManagement',
    ],
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
    href: '/labs/experimental/equipment',
    labelKeys: [
      'commandMenu.items.experimentalEquipmentArchive',
      'commandMenu.parents.experimental',
    ],
    keywords: ['lab', 'laboratory', 'equipment', '实验设备'],
    pinyin: 'sysbda',
  },
  {
    href: '/labs/experimental/tests',
    labelKeys: [
      'commandMenu.items.experimentalProjects',
      'commandMenu.parents.experimental',
    ],
    keywords: ['lab', 'laboratory', 'project', '测试'],
    pinyin: 'syxm',
  },
  {
    href: '/labs/experimental/reports',
    labelKeys: [
      'commandMenu.items.experimentalReportArchive',
      'commandMenu.parents.experimental',
    ],
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
  const itemsByHref = new Map(
    buildGlobalSearchNavigationItems(t).map((item) => [item.href, item])
  )
  for (const config of moduleSearchKeywordOverrides) {
    const navigationItem = itemsByHref.get(config.href)
    if (!navigationItem) continue
    itemsByHref.set(config.href, {
      ...navigationItem,
      pinyin: config.pinyin,
      keywords: [
        ...(navigationItem?.keywords ?? []),
        ...config.labelKeys.map((key) => t(key)),
        ...config.keywords,
      ],
    })
  }
  return [...itemsByHref.values()]
}

function getActionItems(t: TranslateFn): SearchItem[] {
  return getEnabledConfigs(actionConfigs).map((config) =>
    toSearchItem(t, config, 'actions', PlusCircle)
  )
}

export function getKnowledgeRouteOptions(
  t: TranslateFn
): KnowledgeRouteOption[] {
  return getTabItems(t).map((item) => ({
    value: item.href,
    label: item.title,
    parentLabel: item.parentTitle ?? '',
  }))
}

export function getSearchItems(t: TranslateFn): SearchItem[] {
  return [...getTabItems(t), ...getActionItems(t)]
}
