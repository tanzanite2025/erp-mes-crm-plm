import { type BusinessEventSourceTemplate } from '../business-event-source-types'

export const DEFAULT_PURCHASE_ORDER_EVENT_SOURCE: BusinessEventSourceTemplate =
  {
    code: 'PURCHASE_ORDER',
    name: '采购订单',
    module: 'Trading',
    entity: 'ORDER',
    enabled: true,
    description: '采购订单创建、下达、待收货、收货和取消等生命周期事件。',
    config: {
      actions: [
        { code: 'CREATED', name: '新建', kind: 'created' },
        { code: 'STATUS_CHANGED', name: '状态变更', kind: 'status' },
        { code: 'RECEIVED', name: '收货完成', kind: 'status' },
      ],
      statuses: [
        { code: 'Draft' },
        { code: 'Sent' },
        { code: 'Awaiting' },
        { code: 'Received' },
        { code: 'Canceled' },
      ],
      fields: [
        {
          key: 'purchaseOrderId',
          label: '采购单ID',
          path: 'purchaseOrderId',
          type: 'string',
          templateKey: 'PurchaseOrderId',
          templateEnabled: true,
          dynamicResolver: false,
        },
        {
          key: 'purchaseOrderNo',
          label: '采购单号',
          path: 'purchaseOrderNo',
          type: 'string',
          templateKey: 'PurchaseOrderNo',
          templateEnabled: true,
          dynamicResolver: false,
        },
        {
          key: 'supplierName',
          label: '供应商',
          path: 'supplierName',
          type: 'string',
          templateKey: 'SupplierName',
          templateEnabled: true,
          dynamicResolver: false,
        },
        {
          key: 'purchaser',
          label: '采购员',
          path: 'purchaser',
          type: 'user',
          templateKey: 'Purchaser',
          templateEnabled: true,
          dynamicResolver: true,
        },
      ],
      dynamicResolvers: [
        {
          code: 'purchaser',
          label: '采购员',
          path: 'purchaser',
          type: 'user',
        },
        {
          code: 'approval.manager',
          label: '直属审批经理',
          path: 'approval.manager',
          type: 'user',
        },
      ],
      defaultActionUrlTemplate:
        '/purchase/orders?search=[PurchaseOrderNo]&detailId=[PurchaseOrderId]',
    },
    meta: {
      runtimeCoverage: 'connected',
      notificationType: 'ORDER_EVENT',
      forceStatusChangedAction: true,
      seedAsFallback: true,
    },
  }
