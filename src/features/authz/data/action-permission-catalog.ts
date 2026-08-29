/**
 * 动作级权限映射表 + 路由绑定规范化。
 *
 * 动作级权限 = "用户能不能执行某个动作"(创建订单 / 删除产品 / 提交审批),
 * 比路由级权限更细粒度。本文件提供 legacy 配置 → 标准 ActionPermissionEntry 的规范化转换。
 *
 * 数据流:
 *   - 模块自定义 LegacyActionPermissionEntry[](人类可读)
 *   - normalizeActionPermissionCatalog 转为运行时校验格式 ActionPermissionEntry
 *   - normalizeActionRouteBinding 把动作绑定到具体路由(权限传递 + 默认路由跳转)
 *
 * 关键不变量:
 *   - 所有路由绑定字段经过 normalizeActionRouteBinding 兜底,允许 legacy 配置缺字段
 *   - 输出格式与 permission-schema 严格对齐(类型层守护)
 */
import type { Permission } from '@/features/authz/data/permission-schema'

export type ActionRouteBinding = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  note?: string
}

type LegacyActionRouteBinding = string

type LegacyActionPermissionEntry = Permission & {
  routeBindings: LegacyActionRouteBinding[]
}

export type ActionPermissionEntry = Permission & {
  routeBindings: ActionRouteBinding[]
}

function normalizeActionRouteBinding(
  binding: LegacyActionRouteBinding
): ActionRouteBinding {
  const match = binding.match(
    /^\s*(GET|POST|PUT|PATCH|DELETE)\s+([^\s(]+)\s*(?:\((.*)\))?$/
  )
  if (!match) {
    throw new Error(
      `[action-permission-catalog] Unparseable route binding: ${binding}`
    )
  }

  const [, method, path, note] = match
  return {
    method: method.toUpperCase() as ActionRouteBinding['method'],
    path,
    note: note?.trim() || undefined,
  }
}

function normalizeActionPermissionEntry(
  entry: LegacyActionPermissionEntry
): ActionPermissionEntry {
  return {
    ...entry,
    routeBindings: entry.routeBindings.map(normalizeActionRouteBinding),
  }
}

function normalizeActionPermissionCatalog<
  T extends Record<string, LegacyActionPermissionEntry[]>,
>(catalog: T): Record<keyof T, ActionPermissionEntry[]> {
  return Object.fromEntries(
    Object.entries(catalog).map(([catalogKey, entries]) => [
      catalogKey,
      entries.map(normalizeActionPermissionEntry),
    ])
  ) as Record<keyof T, ActionPermissionEntry[]>
}

const systemActions: LegacyActionPermissionEntry[] = [
  {
    id: 'user_view',
    label: '查看用户',
    desc: '允许查看用户列表和用户详情。',
    category: 'action',
    parentId: 'menu_system',
    routeBindings: [
      'GET /users (personnel/accounts、personnel/rights、user_view 或 perm_manage)',
      'GET /users/options (menu_system、user_view 或 perm_manage)',
      'GET /permission-presets (personnel/accounts、personnel/rights、user_view 或 perm_manage)',
    ],
  },
  {
    id: 'user_create',
    label: '新增用户',
    desc: '允许创建新的系统用户账号。',
    category: 'action',
    parentId: 'menu_system',
    routeBindings: ['POST /users', 'POST /org', 'POST /employees'],
  },
  {
    id: 'user_edit',
    label: '编辑用户',
    desc: '允许更新用户资料和账号状态。',
    category: 'action',
    parentId: 'menu_system',
    routeBindings: [
      'PATCH /users/:id',
      'PUT /users/:id',
      'PATCH /employees/status',
    ],
  },
  {
    id: 'user_delete',
    label: '删除用户',
    desc: '允许删除用户账号。',
    category: 'action',
    parentId: 'menu_system',
    routeBindings: [
      'DELETE /users/:id',
      'POST /users/bulk-delete',
      'DELETE /org/:id',
      'DELETE /employees/:id',
    ],
  },
  {
    id: 'user_invite',
    label: '邀请用户',
    desc: '为后续邀请流程预留的权限。',
    category: 'action',
    parentId: 'menu_system',
    routeBindings: [],
  },
  {
    id: 'perm_manage',
    label: '管理权限配置',
    desc: '允许管理用户权限、系统配置和基础权限。',
    category: 'action',
    parentId: 'menu_system',
    routeBindings: [
      'POST /users/admin/verify',
      'GET /users/:id/access (personnel/rights 或 perm_manage)',
      'GET /users/:id/permissions (personnel/rights 或 perm_manage)',
      'PUT /users/:id/permissions',
      'POST /users/:id/bind-employee',
      'POST /users/:id/unbind-employee',
      'POST /users/sync',
      'GET /ai/policy/admin',
      'POST /ai/policy/admin',
      'GET /ai/usage/summary',
      'GET /ai/usage/logs',
      'POST /system/configs',
      'POST /org',
      'POST /org/sync',
      'DELETE /org/:id',
      'POST /employees',
      'PATCH /employees/status',
      'POST /employees/sync',
      'DELETE /employees/:id',
      'POST /raw-materials/prepreg-specs',
      'DELETE /raw-materials/prepreg-specs/:id',
      'POST /raw-materials/prepreg-binding-tokens/:token/bind',
      'POST /engineering/product-appearances',
      'PATCH /engineering/product-appearances/:id',
      'DELETE /engineering/product-appearances/:id',
      'PATCH /engineering/products/:id',
      'DELETE /engineering/products/:id',
      'PATCH /engineering/specs/:id',
      'PATCH /engineering/templates/:id',
      'DELETE /engineering/templates/:id',
      'PATCH /engineering/product-types/:id',
      'DELETE /engineering/product-types/:id',
      'POST /engineering/product-attribute-categories',
      'POST /engineering/product-attribute-categories/reorder',
      'DELETE /engineering/product-attribute-categories/:id',
      'POST /engineering/product-attribute-options',
      'POST /engineering/product-attribute-options/reorder',
      'DELETE /engineering/product-attribute-options/:id',
      'POST /engineering/bom-sections',
      'PATCH /engineering/bom-sections/:id',
      'DELETE /engineering/bom-sections/:id',
      'POST /raw-materials-engine/config',
      'POST /packaging/profiles',
      'DELETE /packaging/profiles/:id',
      'POST /logistics-config/vehicle-model-templates',
      'PATCH /logistics-config/vehicle-model-templates/:id',
      'POST /logistics-config/vehicle-model-templates/:id/versions/:version/restore',
      'POST /assets/vehicle-model-templates/upload',
      'POST /logistics-config/vehicle-model-templates/:id/parse',
      'POST /logistics-config/vehicle-model-templates/:id/parse/tasks',
      'POST /logistics-config/vehicle-model-templates/:id/parse/tasks/:taskId/retry',
      'POST /message-center/event-sources',
      'POST /message-center/event-sources/:id/status-rename-transaction',
      'PUT /message-center/event-sources/:id',
      'DELETE /message-center/event-sources/:id',
      'POST /knowledge-base/entries',
      'PUT /knowledge-base/entries/:id',
      'DELETE /knowledge-base/entries/:id',
      'POST /enterprise/config',
      'POST /enterprise/config/logo',
      'PATCH /quality/standards/:id',
      'PATCH /basic/units/:id',
      'POST /permission-presets',
      'DELETE /permission-presets/:id',
      'POST /assets/upload',
      'POST /finance/currencies/sync-config',
      'POST /finance/payment-methods',
      'PATCH /finance/payment-methods/:id',
      'PATCH /finance/payment-terms/:id',
    ],
  },
]

const warehouseActions: LegacyActionPermissionEntry[] = [
  {
    id: 'action_warehouse_inbound_record',
    label: '仓储：登记入库',
    desc: '允许创建入库记录。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: [
      'POST /inventory/inbound',
      'POST /sales-exchanges/:id/old-item-inbound',
      'POST /sales-returns/:id/inbound',
    ],
  },
  {
    id: 'action_warehouse_shipment_record',
    label: '仓储：登记出库',
    desc: '允许创建出库记录。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: [
      'POST /inventory/shipment',
      'POST /inventory/shipment/virtual-lock',
      'POST /sales-exchanges/:id/replacement-shipment',
      'POST /sales-exchanges/:id/replacement-shipment/:shipmentId/void',
    ],
  },
  {
    id: 'action_inventory_shipment_update',
    label: '仓储：更新出库草稿',
    desc: '允许在提交或作废前更新出库草稿记录。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: ['PATCH /inventory/shipment/:id'],
  },
  {
    id: 'action_warehouse_shipment_commit',
    label: '仓储：提交出库',
    desc: '允许提交并确认出库单。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: ['POST /inventory/shipment/:id/commit'],
  },
  {
    id: 'action_warehouse_shipment_void',
    label: '仓储：作废出库',
    desc: '允许作废已提交的出库单。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: ['POST /inventory/shipment/:id/void'],
  },
  {
    id: 'action_warehouse_transfer',
    label: '仓储：库存调拨',
    desc: '允许执行库存调拨。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: ['POST /inventory/transfer'],
  },
  {
    id: 'action_warehouse_reconcile',
    label: '仓储：库存对账',
    desc: '允许执行库存对账。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: ['POST /inventory/reconcile'],
  },
  {
    id: 'action_warehouse_sync',
    label: '仓储：同步库存',
    desc: '允许批量同步库存数据。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: ['POST /inventory/sync'],
  },
  {
    id: 'action_warehouse_category_manage',
    label: '仓储：管理仓库分类',
    desc: '允许维护仓库分类主数据。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: [
      'POST /warehouse/categories',
      'PATCH /warehouse/categories/:id',
      'DELETE /warehouse/categories/:id',
      'POST /warehouse/threshold-rules',
      'PATCH /warehouse/threshold-rules/:id',
      'DELETE /warehouse/threshold-rules/:id',
    ],
  },
  {
    id: 'action_warehouse_stocktake_manage',
    label: '仓储：管理盘点任务',
    desc: '允许创建盘点任务。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: ['POST /stocktakes', 'PATCH /stocktakes/items/:id'],
  },
  {
    id: 'action_warehouse_adjustment_submit',
    label: '仓储：提交调账',
    desc: '允许提交库存调账审批。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: ['POST /stocktakes/:taskId/post-adjustment'],
  },
  {
    id: 'action_inventory_adjustment_update',
    label: '仓储：更新库存调账',
    desc: '允许通过调账流程更新库存记录。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: ['PATCH /inventory/:id'],
  },
  {
    id: 'action_warehouse_adjustment_execute',
    label: '仓储：执行调账',
    desc: '允许执行已审批的库存调账。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: ['POST /warehouse/adjustments/:id/execute'],
  },
]

const tradingActions: LegacyActionPermissionEntry[] = [
  {
    id: 'action_trading_sales_order_manage',
    label: '贸销：管理销售订单',
    desc: '允许创建或编辑销售订单。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: [
      'POST /sales-orders',
      'POST /sales-orders/:id/transactions',
      'POST /sales-orders/:id/returns',
      'POST /sales-orders/:id/exchanges',
      'POST /sales-returns/:id/line-barcodes',
      'PATCH /sales-orders/:id',
      'PATCH /sales-returns/:id',
      'PATCH /sales-returns/:id/actual-amount',
      'PATCH /sales-returns/:id/logistics',
      'PATCH /sales-exchanges/:id/old-item-logistics',
      'PATCH /quotes/:id',
      'POST /quotes/:id/convert',
    ],
  },
  {
    id: 'action_trading_sales_order_delete',
    label: '贸销：删除销售订单',
    desc: '允许删除销售订单。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: [
      'DELETE /sales-orders/:id',
      'DELETE /sales-returns/:id',
      'DELETE /sales-exchanges/:id',
    ],
  },
  {
    id: 'action_trading_sales_order_sync',
    label: '贸销：同步销售订单',
    desc: '允许批量同步销售订单数据。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: ['POST /sales-orders/sync'],
  },
  {
    id: 'action_trading_customer_manage',
    label: '贸销：管理客户',
    desc: '允许创建或编辑客户资料。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: [
      'POST /customers',
      'POST /customers/:id/transactions',
      'PATCH /customers/:id',
    ],
  },
  {
    id: 'action_trading_customer_delete',
    label: '贸销：删除客户',
    desc: '允许删除客户资料。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: ['DELETE /customers/:id'],
  },
  {
    id: 'action_trading_customer_sync',
    label: '贸销：同步客户',
    desc: '允许批量同步客户数据。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: ['POST /customers/sync'],
  },
  {
    id: 'action_trading_supplier_manage',
    label: '采购：管理供应商',
    desc: '允许创建或编辑供应商资料。',
    category: 'action',
    parentId: 'menu_purchase',
    routeBindings: [
      'POST /suppliers',
      'POST /suppliers/:id/transactions',
      'PATCH /suppliers/:id',
    ],
  },
  {
    id: 'action_trading_supplier_delete',
    label: '采购：删除供应商',
    desc: '允许删除供应商资料。',
    category: 'action',
    parentId: 'menu_purchase',
    routeBindings: ['DELETE /suppliers/:id'],
  },
  {
    id: 'action_trading_supplier_sync',
    label: '采购：同步供应商',
    desc: '允许批量同步供应商数据。',
    category: 'action',
    parentId: 'menu_purchase',
    routeBindings: ['POST /suppliers/sync'],
  },
  {
    id: 'action_trading_purchase_order_manage',
    label: '采购：管理采购订单',
    desc: '允许创建或编辑采购订单。',
    category: 'action',
    parentId: 'menu_purchase',
    routeBindings: [
      'POST /purchase/orders',
      'POST /purchase/orders/:id/transactions',
      'PATCH /purchase/orders/:id',
      'POST /purchase/evidence/upload',
      'POST /purchase/orders/:id/confirm-receipt',
      'POST /purchase/orders/:id/returns',
    ],
  },
  {
    id: 'action_trading_purchase_order_delete',
    label: '采购：删除采购订单',
    desc: '允许删除采购订单。',
    category: 'action',
    parentId: 'menu_purchase',
    routeBindings: ['DELETE /purchase/orders/:id'],
  },
  {
    id: 'action_trading_purchase_order_sync',
    label: '采购：同步采购订单',
    desc: '允许批量同步采购订单数据。',
    category: 'action',
    parentId: 'menu_purchase',
    routeBindings: [],
  },
  {
    id: 'action_trading_logistics_manage',
    label: '贸销：管理物流',
    desc: '允许创建或编辑物流记录。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: ['POST /logistics'],
  },
  {
    id: 'action_trading_logistics_status_update',
    label: '贸销：更新物流状态',
    desc: '允许更新物流状态流转。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: ['PATCH /logistics/:id/status'],
  },
  {
    id: 'action_trading_logistics_delete',
    label: '贸销：删除物流',
    desc: '允许删除物流记录。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: ['DELETE /logistics/:id'],
  },
  {
    id: 'action_trading_logistics_provider_manage',
    label: '贸销：管理物流服务商',
    desc: '允许维护物流推送服务商。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: [
      'POST /logistics-push/providers',
      'POST /logistics-push/providers/:id/verify',
      'DELETE /logistics-push/providers/:id',
    ],
  },
  {
    id: 'action_finance_settlement_manage',
    label: '财务：登记往来结算',
    desc: '允许在应收与应付台账中登记收款和付款记录。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: [
      'POST /receivables/:id/receipts',
      'POST /payables/:id/payments',
    ],
  },
]

const equipmentActions: LegacyActionPermissionEntry[] = [
  {
    id: 'action_equipment_mold_manage',
    label: '设备工装：管理模具',
    desc: '允许创建或编辑模具资产。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: ['POST /molds', 'PATCH /molds/:id'],
  },
  {
    id: 'action_equipment_mold_sync',
    label: '设备工装：同步模具',
    desc: '允许批量同步模具资产。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: ['POST /molds/sync'],
  },
  {
    id: 'action_equipment_drawing_manage',
    label: '设备工装：管理图纸',
    desc: '允许创建或编辑模具图纸。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: ['POST /drawings'],
  },
  {
    id: 'action_equipment_drawing_update',
    label: '设备工装：更新图纸',
    desc: '允许更新模具图纸的基础信息和状态。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: ['PATCH /drawings/:id'],
  },
  {
    id: 'action_equipment_drawing_delete',
    label: '设备工装：删除图纸',
    desc: '允许删除模具图纸。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: ['DELETE /drawings/:id'],
  },
  {
    id: 'action_equipment_furnace_manage',
    label: '炉台管理：维护炉台档案',
    desc: '允许创建或编辑炉台主数据档案。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: ['POST /furnaces', 'PATCH /furnaces/:id'],
  },
  {
    id: 'action_equipment_furnace_sync',
    label: '炉台管理：同步炉台',
    desc: '允许批量同步炉台数据。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: ['POST /furnaces/sync'],
  },
  {
    id: 'action_equipment_partner_manage',
    label: '设备工装：管理协作单位',
    desc: '允许维护设备协作单位资料。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: [
      'POST /equipment-partners',
      'DELETE /equipment-partners/:id',
    ],
  },
  {
    id: 'action_equipment_partner_update',
    label: '设备工装：更新协作单位',
    desc: '允许更新设备协作单位主数据。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: ['PATCH /equipment-partners/:id'],
  },
  {
    id: 'action_equipment_loan_manage',
    label: '设备工装：管理模具借还',
    desc: '允许创建和归还模具借还记录。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: ['POST /mold-loans', 'POST /mold-loans/:id/return'],
  },
  {
    id: 'action_equipment_telemetry_update',
    label: '设备工装：更新遥测数据',
    desc: '允许上报模具和炉台遥测数据。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: [
      'POST /molds/:id/telemetry',
      'POST /furnaces/:id/telemetry',
    ],
  },
  {
    id: 'action_equipment_maintenance_manage',
    label: '设备维保：管理维保记录',
    desc: '允许创建、编辑和删除设备维保记录。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: [
      'POST /maintenance-records',
      'PATCH /maintenance-records/:id',
      'DELETE /maintenance-records/:id',
    ],
  },
]

const approvalActions: LegacyActionPermissionEntry[] = [
  {
    id: 'action_approval_review',
    label: '审批：审核申请',
    desc: '允许处理待审批申请。',
    category: 'action',
    parentId: 'menu_approval',
    routeBindings: ['GET /approvals/my', 'PATCH /approvals/:id/approve'],
  },
]

const engineeringActions: LegacyActionPermissionEntry[] = [
  {
    id: 'action_material_update',
    label: '工程：更新物料',
    desc: '允许更新物料主数据记录。',
    category: 'action',
    parentId: 'menu_engineering',
    routeBindings: ['PATCH /materials/:id'],
  },
  {
    id: 'action_engineering_bom_manage',
    label: '工程：管理BOM',
    desc: '允许创建、编辑和管理工程BOM。',
    category: 'action',
    parentId: 'menu_engineering',
    routeBindings: [
      'POST /engineering/bom',
      'POST /engineering/bom/:id/derive-mbom',
      'DELETE /engineering/bom/:id',
      'POST /engineering/bom-sections',
      'PATCH /engineering/bom-sections/:id',
      'DELETE /engineering/bom-sections/:id',
    ],
  },
  {
    id: 'action_engineering_bom_promote',
    label: '工程：推广BOM',
    desc: '允许推广和发布工程BOM。',
    category: 'action',
    parentId: 'menu_engineering',
    routeBindings: ['POST /engineering/bom/:id/promote'],
  },
]

const qualityActions: LegacyActionPermissionEntry[] = [
  {
    id: 'action_lab_experimental_category_create',
    label: '品质：创建实验分类',
    desc: '允许创建实验室实验分类。',
    category: 'action',
    parentId: 'menu_quality',
    routeBindings: ['POST /labs/experimental/categories'],
  },
  {
    id: 'action_lab_experimental_category_delete',
    label: '品质：删除实验分类',
    desc: '允许删除实验室实验分类。',
    category: 'action',
    parentId: 'menu_quality',
    routeBindings: ['DELETE /labs/experimental/categories/:id'],
  },
]

const orgActions: LegacyActionPermissionEntry[] = [
  {
    id: 'action_org_profile_update',
    label: '组织人事：更新组织资料',
    desc: '允许更新组织机构资料。',
    category: 'action',
    parentId: 'menu_org',
    routeBindings: ['PATCH /org/:id'],
  },
  {
    id: 'action_employee_update',
    label: '组织人事：更新员工资料',
    desc: '允许更新员工档案资料。',
    category: 'action',
    parentId: 'menu_org',
    routeBindings: [
      'PATCH /employees/:id',
      'POST /employees/:id/change-org-unit',
      'POST /employees/:id/change-position',
      'POST /employees/:id/clear-position',
    ],
  },
  {
    id: 'action_hr_detail_view',
    label: '组织人事：查看员工详情',
    desc: '允许查看员工档案详情。',
    category: 'action',
    parentId: 'menu_org',
    routeBindings: ['GET /employees/:id'],
  },
  {
    id: 'action_employee_import_preview',
    label: '组织人事：预览员工导入',
    desc: '允许执行员工导入预览。',
    category: 'action',
    parentId: 'menu_org',
    routeBindings: ['POST /employees/import/preview'],
  },
  {
    id: 'action_employee_import_commit',
    label: '组织人事：提交员工导入',
    desc: '允许提交员工导入批次。',
    category: 'action',
    parentId: 'menu_org',
    routeBindings: ['POST /employees/import/commit'],
  },
  {
    id: 'action_attendance_device_manage',
    label: '组织人事：维护考勤设备',
    desc: '允许新增、更新、删除与测试考勤采集设备绑定。',
    category: 'action',
    parentId: 'menu_org',
    routeBindings: [
      'POST /attendance-devices',
      'DELETE /attendance-devices/:id',
      'POST /attendance-devices/:id/test',
    ],
  },
]

const productionActions: LegacyActionPermissionEntry[] = [
  {
    id: 'action_production_line_update',
    label: '生产：更新产线拓扑',
    desc: '允许更新产线拓扑快照。',
    category: 'action',
    parentId: 'menu_prod_config',
    routeBindings: ['PATCH /production/lines/:id'],
  },
  {
    id: 'action_production_route_manage',
    label: '生产：管理生产路线',
    desc: '允许创建、更新和删除生产路线及其步骤。',
    category: 'action',
    parentId: 'menu_prod_config',
    routeBindings: ['POST /production/routes', 'DELETE /production/routes/:id'],
  },
  {
    id: 'action_production_plan_manage',
    label: '生产：管理生产计划',
    desc: '允许创建和更新生产计划。',
    category: 'action',
    parentId: 'menu_prod_config',
    routeBindings: ['POST /production/plans'],
  },
  {
    id: 'action_production_issuance_execute',
    label: '生产：执行领料下发',
    desc: '允许创建裁纱领料下发执行记录。',
    category: 'action',
    parentId: 'menu_prod_config',
    routeBindings: [
      'POST /production/cutting-issuances',
      'POST /production/product-barcode-states',
      'POST /production/execution-lots',
      'POST /production/operation-executions',
      'POST /production/scan-commands/execute',
    ],
  },
  {
    id: 'action_outsource_partner_manage',
    label: '生产：管理委外单位',
    desc: '允许创建、更新和删除生产委外单位档案。',
    category: 'action',
    parentId: 'menu_prod_config',
    routeBindings: [
      'POST /production/outsourcing/partners',
      'PATCH /production/outsourcing/partners/:id',
      'DELETE /production/outsourcing/partners/:id',
    ],
  },
  {
    id: 'action_outsource_order_manage',
    label: '生产：管理委外任务',
    desc: '允许创建、更新、删除、下发和作废生产委外任务。',
    category: 'action',
    parentId: 'menu_prod_config',
    routeBindings: [
      'POST /production/outsourcing/orders',
      'PATCH /production/outsourcing/orders/:id',
      'DELETE /production/outsourcing/orders/:id',
      'POST /production/outsourcing/orders/:id/release',
      'POST /production/outsourcing/orders/:id/cancel',
    ],
  },
  {
    id: 'action_outsource_transfer_execute',
    label: '生产：执行委外收发',
    desc: '允许登记委外明细的产品条码发出和回厂。',
    category: 'action',
    parentId: 'menu_prod_config',
    routeBindings: [
      'POST /production/outsourcing/order-lines/:lineId/send',
      'POST /production/outsourcing/order-lines/:lineId/return',
    ],
  },
  {
    id: 'action_outsource_inspection_submit',
    label: '生产：提交委外检验',
    desc: '允许提交委外回厂后的检验结果，并推进产品条码工序状态。',
    category: 'action',
    parentId: 'menu_prod_config',
    routeBindings: ['POST /production/outsourcing/order-lines/:lineId/inspect'],
  },
  {
    id: 'action_barcode_binding_manage',
    label: '生产：管理产品条码绑定',
    desc: '允许创建产品条码绑定记录。',
    category: 'action',
    parentId: 'menu_prod_config',
    routeBindings: ['POST /production/product-barcode-bindings'],
  },
  {
    id: 'action_cutting_size_inventory_record',
    label: '裁纱：录入尺寸库存',
    desc: '允许在裁纱尺寸库存中为裁切尺寸库的尺寸单元录入库存数量。',
    category: 'action',
    parentId: 'menu_piecework',
    routeBindings: ['POST /cutting-operations/size-inventory/records'],
  },
]

const cuttingEngineActions: LegacyActionPermissionEntry[] = [
  {
    id: 'action_cutting_engine_config_manage',
    label: '裁纱引擎：维护配置',
    desc: '允许保存裁纱引擎规则与物理约束配置。',
    category: 'action',
    parentId: 'menu_cutting_engine',
    routeBindings: ['POST /raw-materials-engine/config'],
  },
]

export const ACTION_PERMISSION_CATALOG: Record<
  string,
  ActionPermissionEntry[]
> = normalizeActionPermissionCatalog({
  system: systemActions,
  warehouse: warehouseActions,
  trading: tradingActions,
  engineering: engineeringActions,
  quality: qualityActions,
  equipment: equipmentActions,
  org: orgActions,
  production: productionActions,
  cuttingEngine: cuttingEngineActions,
  approval: approvalActions,
})

export const ACTION_PERMISSIONS: Permission[] = Object.values(
  ACTION_PERMISSION_CATALOG
).flat()
