import type { Permission } from '@/features/system-mgmt/data/role-schema'

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
    desc: '允许更新用户资料和角色分配。',
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
    desc: '允许管理角色、系统配置和基础权限。',
    category: 'action',
    parentId: 'menu_system',
    routeBindings: ['POST /users/sync', 'POST /roles', 'DELETE /roles/:id', 'POST /system/configs', 'POST /org', 'POST /org/sync', 'DELETE /org/:id', 'POST /employees', 'PATCH /employees/status', 'POST /employees/sync', 'DELETE /employees/:id'],
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
    label: '仓储：管理库区分类',
    desc: '允许维护仓库分类主数据。',
    category: 'action',
    parentId: 'menu_warehouse',
    routeBindings: ['POST /warehouse/categories', 'DELETE /warehouse/categories/:id'],
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
    routeBindings: ['POST /sales-orders', 'POST /sales-orders/:id/transactions'],
  },
  {
    id: 'action_trading_sales_order_delete',
    label: '贸销：删除销售订单',
    desc: '允许删除销售订单。',
    category: 'action',
    parentId: 'menu_trading',
    routeBindings: ['DELETE /sales-orders/:id'],
  },
  {
    id: 'action_trading_sales_order_sync',
    label: '贸销：同步销售订单',
    desc: '允许批量同步销售订单。',
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
    routeBindings: ['POST /purchase/orders', 'POST /purchase/orders/:id/transactions', 'PATCH /purchase/orders/:id', 'POST /purchase/orders/:id/confirm-receipt'],
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
    id: 'action_equipment_loan_manage',
    label: '设备工装：管理模具借还',
    desc: '允许创建和归还模具借还记录。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: ['POST /mold-loans', 'POST /mold-loans/:id/return'],
  },
  {
    id: 'action_equipment_telemetry_update',
    label: '设备工装：更新遥测',
    desc: '允许上报模具和炉台遥测数据。',
    category: 'action',
    parentId: 'menu_equipment',
    routeBindings: ['POST /molds/:id/telemetry', 'POST /furnaces/:id/telemetry'],
  },
]

const approvalActions: LegacyActionPermissionEntry[] = [
  {
    id: 'action_approval_config_manage',
    label: '审批：管理配置',
    desc: '允许查看和维护审批配置。',
    category: 'action',
    parentId: 'menu_approval',
    routeBindings: [
      'GET /approvals/configs',
      'POST /approvals/configs',
      'DELETE /approvals/configs/:id',
    ],
  },
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

export const ACTION_PERMISSION_CATALOG: Record<string, ActionPermissionEntry[]> =
  normalizeActionPermissionCatalog({
    system: systemActions,
    warehouse: warehouseActions,
    trading: tradingActions,
    equipment: equipmentActions,
    approval: approvalActions,
  })

export const ACTION_PERMISSIONS: Permission[] = Object.values(ACTION_PERMISSION_CATALOG).flat()
