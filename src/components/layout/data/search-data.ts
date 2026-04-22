import type { ElementType } from 'react'
import { type TranslationKey } from '@/locales'
import { Layout, PlusCircle } from 'lucide-react'

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
    id: 'tab-service-leave-management',
    href: '/leave-management',
    titleKey: 'commandMenu.items.leaveManagement',
    parentKey: 'commandMenu.parents.serviceCenter',
    keywords: ['leave', 'vacation', '请假'],
    pinyin: 'qjgl',
  },
  {
    id: 'tab-service-hall-of-fame',
    href: '/hall-of-fame',
    titleKey: 'commandMenu.items.hallOfFame',
    parentKey: 'commandMenu.parents.serviceCenter',
    keywords: ['honor', 'ranking', '荣誉榜'],
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
    id: 'tab-trading-logistics',
    href: '/trading/logistics',
    titleKey: 'trading.tabs.logistics',
    parentKey: 'commandMenu.parents.salesManagement',
    keywords: ['logistics', '物流'],
    pinyin: 'wlgl',
  },
  {
    id: 'tab-sales-analysis-orders-analysis',
    href: '/sales-analysis/orders-analysis',
    titleKey: 'commandMenu.items.salesAnalysis',
    parentKey: 'commandMenu.parents.salesManagement',
    keywords: ['analysis', 'sales analysis', 'orders', '订单分析', '销售分析'],
    pinyin: 'xsfx',
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
    id: 'tab-terminal-mobile-capture',
    href: '/terminal-config/mobile-capture',
    titleKey: 'commandMenu.items.terminalMobileCapture',
    parentKey: 'commandMenu.parents.terminalConfig',
    keywords: ['mobile', 'camera', 'capture', 'phone', '移动采集', '手机扫码'],
    pinyin: 'ydcj',
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
    id: 'tab-code-center-shared-numbering-engine',
    href: '/code-center/shared-code-source/numbering-engine',
    titleKey: 'commandMenu.items.sharedNumberingEngine',
    parentKey: 'commandMenu.parents.codeCenter',
    keywords: ['shared', 'numbering', 'engine', 'barcode', 'dm', 'dm码', 'dm号码', '发号', '编号', '业务编号', '规则'],
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
    id: 'tab-raw-materials',
    href: '/raw-materials',
    titleKey: 'commandMenu.items.rawMaterialsManagement',
    parentKey: 'commandMenu.parents.resourceManagement',
    keywords: [
      'raw material',
      'procurement',
      'catalog',
      '原材料',
      '原材料管理',
    ],
    pinyin: 'yclgl',
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
  // --- 工程类 (Engineering) ---
  {
    id: 'action-add-material',
    href: '/materials?action=add',
    titleKey: 'commandMenu.items.addMaterial',
    parentKey: 'commandMenu.parents.engineeringManagement',
    keywords: ['material', 'add', 'new', '新增物料', '创建物料'],
    pinyin: 'xzwl',
  },
  {
    id: 'action-add-product',
    href: '/engineering/products?action=add',
    titleKey: 'commandMenu.items.addProduct',
    parentKey: 'commandMenu.parents.engineeringManagement',
    keywords: ['product', 'bom', 'add', '创建型号', '新增产品'],
    pinyin: 'xzcp',
  },
  {
    id: 'action-import-drawing',
    href: '/engineering/drawings?action=import',
    titleKey: 'commandMenu.items.importDrawing',
    parentKey: 'commandMenu.parents.engineeringManagement',
    keywords: ['drawing', 'import', 'upload', '导入图纸', '上传'],
    pinyin: 'drtz',
  },

  // --- 贸销类 (Trading) ---
  {
    id: 'action-add-customer',
    href: '/trading/customers?action=add',
    titleKey: 'commandMenu.items.addCustomer',
    parentKey: 'commandMenu.parents.salesManagement',
    keywords: ['customer', 'partner', 'add', '新增客户', '登记'],
    pinyin: 'xzkh',
  },
  {
    id: 'action-create-sales-order',
    href: '/trading/sales-orders?action=create',
    titleKey: 'commandMenu.items.createSalesOrder',
    parentKey: 'commandMenu.parents.salesManagement',
    keywords: ['sales', 'order', 'create', '创建订单', '销售'],
    pinyin: 'cjdd',
  },
  {
    id: 'action-create-requirement',
    href: '/mrp/requirements?action=create',
    titleKey: 'commandMenu.items.createRequirement',
    parentKey: 'commandMenu.parents.mrp',
    keywords: ['requirement', 'part', 'mrp', 'new', '发起需求', '料号'],
    pinyin: 'fqxq',
  },

  // --- 仓库类 (Warehouse) ---
  {
    id: 'action-inbound',
    href: '/warehouse/inbound?action=add',
    titleKey: 'commandMenu.items.inboundAction',
    parentKey: 'commandMenu.parents.warehouse',
    keywords: ['inbound', 'action', 'product', '入库操作', '成品'],
    pinyin: 'rkcz',
  },
  {
    id: 'action-start-stocktake',
    href: '/warehouse/stocktake?action=start',
    titleKey: 'commandMenu.items.startStocktake',
    parentKey: 'commandMenu.parents.warehouse',
    keywords: ['stocktake', 'inventory', 'start', '开始盘点', '实地'],
    pinyin: 'kspd',
  },
  {
    id: 'action-inventory-adjustment',
    href: '/warehouse/adjustments?action=new',
    titleKey: 'commandMenu.items.newAdjustment',
    parentKey: 'commandMenu.parents.warehouse',
    keywords: ['adjustment', 'fix', 'stock', '调账操作', '修正'],
    pinyin: 'tzcz',
  },

  // --- 人事与系统 (System & HR) ---
  {
    id: 'action-add-employee',
    href: '/personnel/employees?action=add',
    titleKey: 'commandMenu.items.addEmployee',
    parentKey: 'commandMenu.parents.employeeManagement',
    keywords: ['employee', 'staff', 'add', '新入职', '添加员工'],
    pinyin: 'xryz',
  },
  {
    id: 'action-print-labels',
    href: '/print-mgmt',
    titleKey: 'commandMenu.items.printLabels',
    parentKey: 'commandMenu.parents.systemSettings',
    keywords: ['print', 'label', 'batch', '打印中心'],
    pinyin: 'dyzx',
  },
  {
    id: 'action-approval-center',
    href: '/approval/routing',
    titleKey: 'commandMenu.items.approvalCenter',
    parentKey: 'commandMenu.parents.systemSettings',
    keywords: [
      'approval',
      'workflow',
      'center',
      'message',
      'routing',
      '消息中心',
      '审批中心',
    ],
    pinyin: 'spzx',
  },
]

function buildKeywords(
  t: TranslateFn,
  titleKey: TranslationKey,
  parentKey: TranslationKey,
  extraKeywords: string[] = []
) {
  return [t(titleKey), t(parentKey), ...extraKeywords]
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
  return moduleGroups.map((config) =>
    toSearchItem(t, config, 'modules', Layout)
  )
}

function getActionItems(t: TranslateFn): SearchItem[] {
  return actionConfigs.map((config) =>
    toSearchItem(t, config, 'actions', PlusCircle)
  )
}

export function getSearchItems(t: TranslateFn): SearchItem[] {
  return [...getTabItems(t), ...getActionItems(t)]
}
