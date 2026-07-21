import { DEFAULT_LOCALE, translate, type TranslationKey } from '@/locales'

const ROUTE_PERMISSION_LABEL_KEYS: Record<string, TranslationKey> = {
  '/dashboard': 'sidebar.items.dashboard',
  '/dashboard/overview': 'sidebar.items.dashboard',
  '/warehouse': 'warehouse.tabs.stock',
  '/warehouse/reports': 'warehouse.tabs.reports',
  '/warehouse/inbound': 'warehouse.tabs.inbound',
  '/warehouse/shipment': 'warehouse.tabs.shipment',
  '/warehouse/stocktake': 'warehouse.tabs.stocktake',
  '/warehouse/adjustments': 'warehouse.tabs.adjustments',
  '/warehouse-config': 'sidebar.items.warehouseConfig',
  '/warehouse-config/material-thresholds':
    'warehouseConfig.tabs.materialThresholds',
  '/warehouse-config/packaging-assembly':
    'warehouseConfig.tabs.packagingAssembly',
  '/warehouse-config/category': 'warehouse.tabs.category',
  '/mrp': 'sidebar.items.mrp',
  '/mrp/requirements': 'mrp.tabs.requirements',
  '/purchase': 'sidebar.items.purchaseManagement',
  '/purchase/suppliers': 'purchase.tabs.suppliers',
  '/purchase/orders': 'purchase.tabs.orders',
  '/purchase/logistics': 'purchase.tabs.logistics',
  '/raw-materials': 'sidebar.items.cuttingDatabase',
  '/raw-materials/catalog': 'rawMaterials.tabs.catalog',
  '/raw-materials/binding-qr': 'rawMaterials.tabs.bindingQr',
  '/raw-materials/cut-size-library': 'rawMaterials.tabs.cutSizeLibrary',
  '/raw-materials/cutting-plan': 'rawMaterials.tabs.cuttingPlan',
  '/raw-materials-engine/config': 'sidebar.items.cuttingEngine',
  '/raw-materials-engine/cutting-simulation': 'rawMaterials.tabs.batchEngine',
  '/cutting-operations': 'sidebar.items.cuttingOperations',
  '/cutting-operations/cutting-issuance': 'commandMenu.items.cuttingOperations',
  '/cutting-operations/product-binding':
    'cuttingOperations.tabs.productBinding',
  '/cutting-operations/size-inventory':
    'commandMenu.items.cuttingSizeInventory',
  '/trading': 'sidebar.items.salesManagement',
  '/trading/customers': 'trading.tabs.customers',
  '/trading/sales-orders': 'trading.tabs.salesOrders',
  '/trading/sales-returns': 'trading.tabs.salesReturns',
  '/trading/sales-exchanges': 'trading.tabs.salesExchanges',
  '/quotes': 'sidebar.items.quoteManagement',
  '/quotes/orders': 'commandMenu.items.quoteManagement',
  '/sales-analysis': 'sidebar.items.salesAnalysis',
  '/sales-analysis/orders-analysis': 'trading.tabs.ordersAnalysis',
  '/shipping-management': 'sidebar.items.shippingManagement',
  '/shipping-management/vehicle-match':
    'trading.shippingManagement.tabs.vehicleMatch',
  '/shipping-management/vehicle-contacts':
    'trading.shippingManagement.tabs.vehicleContacts',
  '/shipping-management/logistics': 'trading.shippingManagement.tabs.logistics',
  '/engineering': 'sidebar.items.productEngineering',
  '/product-structure': 'sidebar.items.productStructure',
  '/product-structure/bom': 'engineering.tabs.bom',
  '/product-structure/bom-records': 'engineering.tabs.bomRecords',
  '/product-structure/section-config': 'engineering.tabs.sectionConfig',
  '/engineering/products': 'engineering.tabs.products',
  '/engineering/product-appearance': 'engineering.tabs.productAppearance',
  '/engineering/product-attributes': 'engineering.tabs.productAttributes',
  '/engineering/bom': 'engineering.tabs.bom',
  '/engineering/templates': 'engineering.tabs.templates',
  '/engineering/types': 'engineering.tabs.types',
  '/engineering-db': 'sidebar.items.engineeringDatabase',
  '/engineering-db/specs': 'engineering.db.categories.spec',
  '/engineering-db/drilling': 'engineering.db.categories.drilling',
  '/engineering-db/engineering-master': 'engineering.masterData.page.title',
  '/engineering-db/engineering-master/weaving-mode':
    'engineering.masterData.tabs.weavingMode',
  '/engineering-db/labeling': 'engineering.db.categories.labeling',
  '/engineering-reference': 'sidebar.items.engineeringReference',
  '/engineering-reference/spoke-length':
    'engineering.spokeLength.overview.title',
  '/engineering-reference/hubs': 'engineering.hubs.overview.title',
  '/engineering-reference/nipples': 'engineering.nipples.overview.title',
  '/quality': 'sidebar.items.qualityAudit',
  '/quality/standards': 'quality.layout.tabs.standards',
  '/labs/experimental': 'labExperimental.tabs.centerTitle',
  '/labs/experimental/equipment': 'labExperimental.tabs.equipment',
  '/labs/experimental/tests': 'labExperimental.tabs.tests',
  '/labs/experimental/reports': 'labExperimental.tabs.reports',
  '/materials': 'sidebar.items.materialArchive',
  '/materials/all': 'materialArchive.layout.tabs.all',
  '/materials/assembly': 'materialArchive.layout.tabs.assembly',
  '/production-quality': 'sidebar.items.qualityOperations',
  '/production-quality/abnormalities':
    'productionQuality.layout.tabs.abnormalities',
  '/production-quality/inspection': 'productionQuality.layout.tabs.inspection',
  '/production-quality/special-buy': 'productionQuality.layout.tabs.specialBuy',
  '/piecework': 'sidebar.items.piecework',
  '/piecework/query': 'piecework.layout.tabs.query',
  '/piecework/rules': 'piecework.layout.tabs.rules',
  '/piecework/stats': 'piecework.layout.tabs.stats',
  '/piecework/teams': 'piecework.layout.tabs.teams',
  '/aps-scheduling': 'sidebar.items.apsScheduling',
  '/aps-scheduling/board': 'sidebar.items.apsScheduling',
  '/aps-scheduling/engine-config': 'apsScheduling.engineConfig.title',
  '/aps-scheduling/engine-tuning': 'apsScheduling.layout.tabs.engineTuning',
  '/production-architecture': 'sidebar.items.productionArchitecture',
  '/production-architecture/line': 'productionArchitecture.layout.tabs.line',
  '/production-architecture/mindmap':
    'productionArchitecture.layout.tabs.mindmap',
  '/production-architecture/hierarchy-config':
    'productionArchitecture.layout.tabs.hierarchyConfig',
  '/production-architecture/topology':
    'productionArchitecture.layout.tabs.topology',
  '/equipment-tooling': 'sidebar.items.toolingAssets',
  '/equipment-tooling/overview': 'equipmentTooling.layout.tabs.overview',
  '/equipment-tooling/molds': 'equipmentTooling.layout.tabs.molds',
  '/equipment-tooling/loans': 'equipmentTooling.layout.tabs.loans',
  '/equipment-tooling/drawings': 'equipmentTooling.layout.tabs.drawings',
  '/equipment-tooling/partners': 'equipmentTooling.layout.tabs.partners',
  '/equipment-maintenance': 'sidebar.items.maintenanceCenter',
  '/equipment-maintenance/overview':
    'equipmentTooling.maintenanceCenter.tabs.overview',
  '/equipment-maintenance/records':
    'equipmentTooling.maintenanceCenter.tabs.records',
  '/tooling-furnaces': 'sidebar.items.furnaceAssets',
  '/tooling-furnaces/center': 'sidebar.items.furnaceAssets',
  '/personnel': 'sidebar.items.personnelCenter',
  '/personnel/org': 'orgPersonnel.tabs.org',
  '/personnel/employees': 'orgPersonnel.tabs.employees',
  '/personnel/accounts': 'orgPersonnel.tabs.accounts',
  '/personnel/rights': 'orgPersonnel.tabs.rights',
  '/leave-management': 'orgPersonnel.tabs.leave',
  '/hall-of-fame': 'orgPersonnel.tabs.stats',
  '/logistics-config': 'sidebar.items.logisticsConfig',
  '/logistics-config/scanning': 'logisticsConfig.tabs.scanning',
  '/logistics-config/packaging-rules': 'logisticsConfig.tabs.packagingRules',
  '/logistics-config/vehicle-loading': 'logisticsConfig.tabs.vehicleLoading',
  '/logistics-config/vehicle-specs-library':
    'logisticsConfig.tabs.vehicleSpecsLibrary',
  '/logistics-settings': 'sidebar.items.logisticsSettings',
  '/logistics-settings/platforms': 'logisticsConfig.tabs.platforms',
  '/logistics-settings/scanning': 'logisticsConfig.tabs.scanning',
  '/finance-management': 'sidebar.items.financeCenter',
  '/finance-management/payment-methods': 'finance.layout.tabs.paymentMethods',
  '/finance-management/payment-terms': 'finance.layout.tabs.paymentTerms',
  '/finance-management/currency-rates': 'finance.layout.tabs.currencyRates',
  '/finance-management/taxation': 'finance.layout.tabs.taxation',
  '/finance-settlements': 'finance.layout.tabs.settlements',
  '/code-center': 'sidebar.groups.codeCenter',
  '/code-center/linear-barcode': 'sidebar.items.linearBarcode',
  '/code-center/linear-barcode/protocol':
    'codeCenter.linearBarcode.tabs.protocol',
  '/code-center/linear-barcode/print': 'codeCenter.linearBarcode.tabs.print',
  '/code-center/shared-code-source': 'sidebar.items.sharedCodeSource',
  '/code-center/shared-code-source/hole-codes':
    'codeCenter.sharedCodeSource.tabs.holeCodes',
  '/code-center/shared-code-source/numbering-engine':
    'codeCenter.sharedCodeSource.tabs.numberingEngine',
  '/terminal-config': 'sidebar.items.terminalConfig',
  '/terminal-config/pda': 'terminalConfig.tabs.pda',
  '/terminal-config/scanners': 'terminalConfig.tabs.scanners',
  '/terminal-config/mobile-capture': 'terminalConfig.tabs.mobileCapture',
  '/sidebar-command-assignment': 'sidebar.items.sidebarCommandAssignment',
  '/sidebar-command-library': 'sidebar.items.sidebarCommandAssignment',
  '/system-management': 'sidebar.items.systemManagement',
  '/system-management/ai-capability': 'aiAssistant.accessControl.title',
  '/system-management/audit-engine': 'systemManagement.layout.tabs.auditEngine',
  '/approval': 'sidebar.items.approvalCenter',
  '/approval/requests': 'approval.tabs.requests',
  '/approval/history': 'approval.tabs.history',
  '/approval/routing': 'sidebar.items.messageCenter',
  '/message-center': 'sidebar.items.messageCenter',
  '/message-center/rules': 'messageCenter.tabs.rules',
  '/message-center/sources': 'messageCenter.tabs.sources',
  '/message-center/templates': 'messageCenter.tabs.templates',
  '/message-center/executions': 'messageCenter.tabs.executions',
  '/basic-settings': 'sidebar.items.basicSettings',
  '/basic-settings/units': 'basicSettings.tabs.units',
  '/basic-settings/knowledge-base': 'basicSettings.tabs.knowledgeBase',
  '/basic-settings/enterprise': 'basicSettings.tabs.enterprise',
  '/basic-settings/security': 'basicSettings.tabs.security',
  '/pda-shell': 'sidebar.items.pdaShell',
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\/+/g, '/').replace(/\/$/, '')
  return normalized || '/'
}

export function resolveRoutePermissionLabelKey(
  path: string
): TranslationKey | undefined {
  let normalizedPath = normalizePath(path)

  while (normalizedPath !== '/') {
    const key = ROUTE_PERMISSION_LABEL_KEYS[normalizedPath]
    if (key) return key
    normalizedPath = normalizePath(
      normalizedPath.split('/').slice(0, -1).join('/')
    )
  }

  return ROUTE_PERMISSION_LABEL_KEYS['/']
}

export function resolveExactRoutePermissionLabelKey(
  path: string
): TranslationKey | undefined {
  return ROUTE_PERMISSION_LABEL_KEYS[normalizePath(path)]
}

export function resolveRoutePermissionLabel(path: string): string | undefined {
  const key = resolveRoutePermissionLabelKey(path)
  if (!key) return undefined
  return translate(DEFAULT_LOCALE, key)
}
