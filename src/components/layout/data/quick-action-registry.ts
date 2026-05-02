import { type TranslationKey } from '@/locales'

export type QuickActionHostKind =
  | 'material-create'
  | 'product-create'
  | 'warehouse-inbound'
  | 'customer-create'
  | 'employee-create'
  | 'sales-order-create'

export type QuickActionDefinition = {
  id: string
  href: string
  titleKey: TranslationKey
  parentKey: TranslationKey
  keywords?: string[]
  pinyin?: string
  enabled?: boolean
  hostKind?: QuickActionHostKind
  successHref?: string
}

export const ENABLED_QUICK_ACTION_IDS = [
  'action-add-material',
  'action-add-product',
  'action-inbound',
  'action-add-customer',
  'action-add-employee',
  'action-create-sales-order',
] as const

export const QUICK_ACTION_DEFINITIONS: QuickActionDefinition[] = [
  {
    id: 'action-add-material',
    href: '/materials?action=add',
    titleKey: 'materialArchive.upsertDialog.createTitle',
    parentKey: 'materialArchive.layout.title',
    keywords: [
      'material',
      'add',
      'new',
      '新增物料',
      '创建物料',
      '登记档案',
      '登记新物料',
      '物料档案',
      '物料主数据',
      '物料资源中心',
    ],
    pinyin: 'djxwl wlda wlzyzx xzwl',
    hostKind: 'material-create',
    successHref: '/materials/RAW_MATERIAL',
  },
  {
    id: 'action-add-product',
    href: '/engineering/products?action=add',
    titleKey: 'commandMenu.items.addProduct',
    parentKey: 'commandMenu.parents.engineeringManagement',
    keywords: ['product', 'add', '创建型号', '新增产品'],
    pinyin: 'xzcp',
    hostKind: 'product-create',
    successHref: '/engineering/products',
  },
  {
    id: 'action-import-drawing',
    href: '/engineering/drawings?action=import',
    titleKey: 'commandMenu.items.importDrawing',
    parentKey: 'commandMenu.parents.engineeringManagement',
    keywords: ['drawing', 'import', 'upload', '导入图纸', '上传'],
    pinyin: 'drtz',
  },
  {
    id: 'action-add-customer',
    href: '/trading/customers?action=add',
    titleKey: 'commandMenu.items.addCustomer',
    parentKey: 'commandMenu.parents.salesManagement',
    keywords: ['customer', 'partner', 'add', '新增客户', '登记'],
    pinyin: 'xzkh',
    hostKind: 'customer-create',
    successHref: '/trading/customers',
  },
  {
    id: 'action-create-sales-order',
    href: '/trading/sales-orders?action=create',
    titleKey: 'commandMenu.items.createSalesOrder',
    parentKey: 'commandMenu.parents.salesManagement',
    keywords: ['sales', 'order', 'create', '创建订单', '销售'],
    pinyin: 'cjdd',
    hostKind: 'sales-order-create',
    successHref: '/trading/sales-orders',
  },
  {
    id: 'action-create-requirement',
    href: '/mrp/requirements?action=create',
    titleKey: 'commandMenu.items.createRequirement',
    parentKey: 'commandMenu.parents.mrp',
    keywords: ['requirement', 'part', 'mrp', 'new', '发起需求', '料号'],
    pinyin: 'fqxq',
  },
  {
    id: 'action-inbound',
    href: '/warehouse/inbound?action=add',
    titleKey: 'commandMenu.items.inboundAction',
    parentKey: 'commandMenu.parents.warehouse',
    keywords: ['inbound', 'action', 'product', '入库操作', '成品'],
    pinyin: 'rkcz',
    hostKind: 'warehouse-inbound',
    successHref: '/warehouse/inbound',
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
  {
    id: 'action-add-employee',
    href: '/personnel/employees?action=add',
    titleKey: 'commandMenu.items.addEmployee',
    parentKey: 'commandMenu.parents.employeeManagement',
    keywords: ['employee', 'staff', 'add', '新入职', '添加员工'],
    pinyin: 'xryz',
    hostKind: 'employee-create',
    successHref: '/personnel/employees',
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

export const HOSTED_QUICK_ACTION_IDS = [
  'action-add-material',
  'action-add-product',
  'action-inbound',
  'action-add-customer',
  'action-add-employee',
  'action-create-sales-order',
] as const

export type HostedQuickActionId = (typeof HOSTED_QUICK_ACTION_IDS)[number]

const hostedQuickActionIdSet = new Set<string>(HOSTED_QUICK_ACTION_IDS)

export function isHostedQuickActionId(id: string): id is HostedQuickActionId {
  return hostedQuickActionIdSet.has(id)
}

export function getQuickActionDefinition(id: string) {
  return QUICK_ACTION_DEFINITIONS.find((definition) => definition.id === id)
}

export function getHostedQuickActionDefinition(id: HostedQuickActionId) {
  return QUICK_ACTION_DEFINITIONS.find(
    (definition): definition is QuickActionDefinition & { hostKind: QuickActionHostKind } =>
      definition.id === id && !!definition.hostKind
  )
}
