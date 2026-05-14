import { type BusinessEventSourceTemplate } from '../business-event-source-types'

export const DEFAULT_SALES_ORDER_EVENT_SOURCE: BusinessEventSourceTemplate = {
  code: 'SALES_ORDER',
  name: '销售订单',
  module: 'Trading',
  entity: 'ORDER',
  enabled: true,
  description: '销售订单创建、状态流转、完成和作废等生命周期事件。',
  config: {
    actions: [
      { code: 'CREATED', name: '新建', kind: 'created' },
      { code: 'STATUS_CHANGED', name: '状态变更', kind: 'status' },
      { code: 'UPDATED', name: '更新', kind: 'updated' },
    ],
    statuses: [
      { code: 'Draft' },
      { code: 'Pending' },
      { code: 'InProgress' },
      { code: 'Done' },
      { code: 'Canceled' },
    ],
    fields: [
      {
        key: 'orderId',
        label: '订单ID',
        path: 'orderId',
        type: 'string',
        templateKey: 'OrderId',
        templateEnabled: true,
        dynamicResolver: false,
      },
      {
        key: 'orderNo',
        label: '订单号',
        path: 'orderNo',
        type: 'string',
        templateKey: 'OrderNo',
        templateEnabled: true,
        dynamicResolver: false,
      },
      {
        key: 'createdBy',
        label: '创建人',
        path: 'createdBy',
        type: 'user',
        templateKey: 'CreatedBy',
        templateEnabled: true,
        dynamicResolver: true,
      },
      {
        key: 'claimedBy',
        label: '负责人',
        path: 'claimedBy',
        type: 'user',
        templateKey: 'ClaimedBy',
        templateEnabled: true,
        dynamicResolver: true,
      },
    ],
    dynamicResolvers: [
      { code: 'createdBy', label: '创建人', path: 'createdBy', type: 'user' },
      {
        code: 'claimedBy',
        label: '负责人 / 认领人',
        path: 'claimedBy',
        type: 'user',
      },
      {
        code: 'approval.manager',
        label: '直属审批经理',
        path: 'approval.manager',
        type: 'user',
      },
    ],
    defaultActionUrlTemplate: '/trading/orders/[OrderId]',
  },
  meta: {
    runtimeCoverage: 'connected',
    notificationType: 'ORDER_EVENT',
    forceStatusChangedAction: true,
    seedAsFallback: true,
  },
}
