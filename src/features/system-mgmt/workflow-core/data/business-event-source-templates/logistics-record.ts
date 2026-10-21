import { type BusinessEventSourceTemplate } from '../business-event-source-types'

// Manual sales/purchase LogisticsRecord events. Carrier DeliveryOrder callbacks
// are a separate tracking projection and do not emit this source.
export const DEFAULT_LOGISTICS_RECORD_EVENT_SOURCE: BusinessEventSourceTemplate =
  {
    code: 'LOGISTICS_RECORD',
    name: '物流记录',
    module: 'Trading',
    entity: 'ORDER',
    enabled: true,
    description: '采购收货、销售发货物流记录的新建、状态变更和进入异常事件。',
    config: {
      actions: [
        { code: 'CREATED', name: '新建', kind: 'created' },
        { code: 'STATUS_CHANGED', name: '状态变更', kind: 'status' },
        { code: 'EXCEPTION', name: '进入异常', kind: 'custom' },
      ],
      statuses: [
        { code: 'Pending' },
        { code: 'InTransit' },
        { code: 'Delivered' },
        { code: 'Exception' },
        { code: 'Canceled' },
      ],
      fields: [
        {
          key: 'logisticsId',
          label: '物流记录ID',
          path: 'logisticsId',
          type: 'string',
          templateKey: 'LogisticsId',
          templateEnabled: true,
          dynamicResolver: false,
        },
        {
          key: 'trackingNo',
          label: '物流单号',
          path: 'trackingNo',
          type: 'string',
          templateKey: 'TrackingNo',
          templateEnabled: true,
          dynamicResolver: false,
        },
        {
          key: 'orderNo',
          label: '关联订单号',
          path: 'orderNo',
          type: 'string',
          templateKey: 'OrderNo',
          templateEnabled: true,
          dynamicResolver: false,
        },
        {
          key: 'logisticsType',
          label: '采购收货/销售发货',
          path: 'logisticsType',
          type: 'string',
          templateKey: 'LogisticsType',
          templateEnabled: true,
          dynamicResolver: false,
        },
        {
          key: 'carrier',
          label: '承运商',
          path: 'carrier',
          type: 'string',
          templateKey: 'Carrier',
          templateEnabled: true,
          dynamicResolver: false,
        },
        {
          key: 'lastLocation',
          label: '当前位置',
          path: 'lastLocation',
          type: 'string',
          templateKey: 'LastLocation',
          templateEnabled: true,
          dynamicResolver: false,
        },
      ],
      dynamicResolvers: [],
      defaultActionUrlTemplate: '[ActionURL]',
    },
    meta: {
      runtimeCoverage: 'connected',
      notificationType: 'ORDER_EVENT',
      forceStatusChangedAction: false,
      seedAsFallback: false,
    },
  }
