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

function normalizeActionRouteBinding(binding: LegacyActionRouteBinding): ActionRouteBinding {
  const match = binding.match(/^\s*(GET|POST|PUT|PATCH|DELETE)\s+([^\s(]+)\s*(?:\((.*)\))?$/)
  if (!match) {
    throw new Error(`[action-permission-catalog] Unparseable route binding: ${binding}`)
  }

  const [, method, path, note] = match
  return {
    method: method.toUpperCase() as ActionRouteBinding['method'],
    path,
    note: note?.trim() || undefined,
  }
}

function normalizeActionPermissionEntry(entry: LegacyActionPermissionEntry): ActionPermissionEntry {
  return {
    ...entry,
    routeBindings: entry.routeBindings.map(normalizeActionRouteBinding),
  }
}

function normalizeActionPermissionCatalog<T extends Record<string, LegacyActionPermissionEntry[]>>(
  catalog: T,
): Record<keyof T, ActionPermissionEntry[]> {
  return Object.fromEntries(
    Object.entries(catalog).map(([catalogKey, entries]) => [
      catalogKey,
      entries.map(normalizeActionPermissionEntry),
    ]),
  ) as Record<keyof T, ActionPermissionEntry[]>
}

const systemActions: LegacyActionPermissionEntry[] = [
  {
    id: 'user_view',
    label: '查看用户',
    desc: '允许查看用户列表和用户详情。',
    category: 'action',
    parentId: 'menu_system',
    routeBindings: ['GET /users (menu_org 或 user_view)'],
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
    routeBindings: ['PATCH /users/:id', 'PUT /users/:id', 'PATCH /employees/status'],
  },
  {
    id: 'user_delete',
    label: '删除用户',
    desc: '允许删除用户账号。',
    category: 'action',
    parentId: 'menu_system',
    routeBindings: ['DELETE /users/:id', 'DELETE /org/:id', 'DELETE /employees/:id'],
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
      'POST /users/sync',
      'POST /system/configs',
      'POST /org',
      'POST /org/sync',
      'DELETE /org/:id',
      'POST /employees',
      'PATCH /employees/status',
      'POST /employees/sync',
      'DELETE /employees/:id',
      'PATCH /dictionary/groups/:code',
      'DELETE /dictionary/groups/:code',
      'PATCH /dictionary/entries/:code',
      'DELETE /dictionary/entries/:code',
    ],
  },
  {
    id: 'action_system_workflow_manage',
    label: '系统：工作流定义维护',
    desc: '允许查看与维护系统工作流定义，并创建流程实例。',
    category: 'action',
    parentId: 'menu_system',
    routeBindings: [
      'GET /workflows/definitions',
      'POST /workflows/definitions',
      'GET /workflows/instances',
      'POST /workflows/instances',
    ],
  },
  {
    id: 'action_system_workflow_review',
    label: '系统：工作流任务审核',
    desc: '允许查看与处理工作流任务。',
    category: 'action',
    parentId: 'menu_system',
    routeBindings: [
      'GET /workflows/tasks',
      'PATCH /workflows/tasks/:id/approve',
      'PATCH /workflows/tasks/:id/reject',
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
    routeBindings: ['POST /inventory/inbound'],
  },
  {
    id: 'action_warehouse_shipment_record',
    label: '仓储：登记出库',
    desc: '允许创建出库记录。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: ['POST /inventory/shipment'],
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
    routeBindings: ['POST /warehouse/categories', 'PATCH /warehouse/categories/:id', 'DELETE /warehouse/categories/:id'],
  },
  {
    id: 'action_warehouse_stocktake_manage',
    label: '仓储：管理盘点任务',
    desc: '允许创建盘点任务。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: ['POST /stocktakes'],
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
    routeBindings: ['POST /sales-orders', 'POST /sales-orders/:id/transactions', 'PATCH /sales-orders/:id'],
  },
  {
    id: 'action_trading_sales_order_delete',
    label: '贸销：删除销售订单',
    desc: '允许删除销售订单。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: ['DELETE /sales-orders/:id', 'DELETE /sales-returns/:id'],
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
    routeBindings: ['POST /customers', 'POST /customers/:id/transactions', 'PATCH /customers/:id'],
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
    label: '贸销：管理供应商',
    desc: '允许创建或编辑供应商资料。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: ['POST /suppliers', 'POST /suppliers/:id/transactions', 'PATCH /suppliers/:id'],
  },
  {
    id: 'action_trading_supplier_delete',
    label: '贸销：删除供应商',
    desc: '允许删除供应商资料。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: ['DELETE /suppliers/:id'],
  },
  {
    id: 'action_trading_supplier_sync',
    label: '贸销：同步供应商',
    desc: '允许批量同步供应商数据。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: ['POST /suppliers/sync'],
  },
  {
    id: 'action_trading_purchase_order_manage',
    label: '贸销：管理采购订单',
    desc: '允许创建或编辑采购订单。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: ['POST /purchase/orders', 'POST /purchase/orders/:id/transactions', 'PATCH /purchase/orders/:id', 'POST /purchase/orders/:id/confirm-receipt', 'POST /purchase/orders/:id/returns'],
  },
  {
    id: 'action_trading_purchase_order_delete',
    label: '贸销：删除采购订单',
    desc: '允许删除采购订单。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: ['DELETE /purchase/orders/:id'],
  },
  {
    id: 'action_trading_purchase_order_sync',
    label: '贸销：同步采购订单',
    desc: '允许批量同步采购订单数据。',
    category: 'action',
    parentId: 'menu_trading',
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
    routeBindings: ['POST /logistics-push/providers', 'DELETE /logistics-push/providers/:id'],
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
    label: '设备工装：管理炉台',
    desc: '允许创建或编辑炉台记录。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: ['POST /furnaces', 'PATCH /furnaces/:id'],
  },
  {
    id: 'action_equipment_furnace_sync',
    label: '设备工装：同步炉台',
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
    routeBindings: ['POST /equipment-partners', 'DELETE /equipment-partners/:id'],
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
    routeBindings: ['POST /molds/:id/telemetry', 'POST /furnaces/:id/telemetry'],
  },
]

const approvalActions: LegacyActionPermissionEntry[] = [

  {
    id: 'action_approval_review',
    label: '审批：审核申请',
    desc: '允许处理待审批申请。',
    category: 'action',
    parentId: 'menu_approval',
    routeBindings: [
      'GET /approvals/my',
      'PATCH /approvals/:id/approve',
    ],
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
    routeBindings: ['PATCH /employees/:id'],
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
]

export const ACTION_PERMISSION_CATALOG: Record<string, ActionPermissionEntry[]> =
  normalizeActionPermissionCatalog({
    system: systemActions,
    warehouse: warehouseActions,
    trading: tradingActions,
    engineering: engineeringActions,
    quality: qualityActions,
    equipment: equipmentActions,
    org: orgActions,
    production: productionActions,
    approval: approvalActions,
  })

export const ACTION_PERMISSIONS: Permission[] = Object.values(ACTION_PERMISSION_CATALOG).flat()
