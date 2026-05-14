import { BOM_STATUS_ORDER } from '@/lib/codecs/code-normalization'
import { type BusinessEventSourceTemplate } from '../business-event-source-types'

/**
 * 研发 BOM (EBOM) 业务事件源模板。
 *
 * 关注点：设计审核流程（DRAFT → REVIEWING → APPROVED → RELEASED → OBSOLETE）。
 * 接收人通常是设计师 / 设计审核委员会 / 工程经理。
 *
 * 数据模型字段：bomType === 'EBOM'。
 * 实时入口在 use-bom-write-actions.ts 中按 bomType 派发到本事件源。
 */
export const DEFAULT_BOM_ENGINEERING_EVENT_SOURCE: BusinessEventSourceTemplate = {
  code: 'BOM_ENGINEERING',
  name: '研发 BOM (EBOM)',
  module: 'Engineering',
  entity: 'BOM',
  enabled: true,
  description:
    '研发 BOM 设计、审核、发布、作废与被派生为生产 BOM 等生命周期事件。',
  config: {
    actions: [
      { code: 'CREATED', name: '新建', kind: 'created' },
      { code: 'STATUS_CHANGED', name: '状态变更', kind: 'status' },
      { code: 'SUBMITTED_FOR_REVIEW', name: '提交审核', kind: 'custom' },
      { code: 'APPROVED', name: '审批通过', kind: 'custom' },
      { code: 'REJECTED', name: '审批驳回', kind: 'custom' },
      { code: 'RELEASED', name: '正式发布', kind: 'custom' },
      { code: 'DERIVED', name: '被派生为 MBOM', kind: 'custom' },
      { code: 'OBSOLETED', name: '作废', kind: 'custom' },
    ],
    statuses: BOM_STATUS_ORDER.map((code) => ({ code })),
    fields: [
      {
        key: 'bomId',
        label: 'BOM ID',
        path: 'bomId',
        type: 'string',
        templateKey: 'BomId',
        templateEnabled: true,
        dynamicResolver: false,
      },
      {
        key: 'bomNo',
        label: 'BOM 编号',
        path: 'bomNo',
        type: 'string',
        templateKey: 'BomNo',
        templateEnabled: true,
        dynamicResolver: false,
      },
      {
        key: 'bomVersion',
        label: '版本号',
        path: 'bomVersion',
        type: 'string',
        templateKey: 'BomVersion',
        templateEnabled: true,
        dynamicResolver: false,
      },
      {
        key: 'productName',
        label: '产品名称',
        path: 'productName',
        type: 'string',
        templateKey: 'ProductName',
        templateEnabled: true,
        dynamicResolver: false,
      },
      {
        key: 'changeType',
        label: '变更类型',
        path: 'changeType',
        type: 'string',
        templateKey: 'ChangeType',
        templateEnabled: true,
        dynamicResolver: false,
      },
      {
        key: 'previousStatus',
        label: '前置状态',
        path: 'previousStatus',
        type: 'string',
        templateKey: 'PreviousStatus',
        templateEnabled: true,
        dynamicResolver: false,
      },
      {
        key: 'createdBy',
        label: '设计师',
        path: 'createdBy',
        type: 'user',
        templateKey: 'CreatedBy',
        templateEnabled: true,
        dynamicResolver: true,
      },
      {
        key: 'reviewer',
        label: '设计审核人',
        path: 'reviewer',
        type: 'user',
        templateKey: 'Reviewer',
        templateEnabled: true,
        dynamicResolver: true,
      },
      {
        key: 'reason',
        label: '状态变更原因',
        path: 'reason',
        type: 'string',
        templateKey: 'Reason',
        templateEnabled: true,
        dynamicResolver: false,
      },
      {
        key: 'approverComment',
        label: '审批意见',
        path: 'approverComment',
        type: 'string',
        templateKey: 'ApproverComment',
        templateEnabled: true,
        dynamicResolver: false,
      },
      {
        key: 'derivedMbomId',
        label: '派生出的 MBOM ID',
        path: 'derivedMbomId',
        type: 'string',
        templateKey: 'DerivedMbomId',
        templateEnabled: true,
        dynamicResolver: false,
      },
    ],
    dynamicResolvers: [
      { code: 'createdBy', label: '设计师', path: 'createdBy', type: 'user' },
      {
        code: 'reviewer',
        label: '设计审核人',
        path: 'reviewer',
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
      '/product-structure/bom?bomId=[BomId]&bomType=EBOM',
  },
  meta: {
    runtimeCoverage: 'connected',
    notificationType: 'BOM_EVENT',
    forceStatusChangedAction: false,
    seedAsFallback: false,
  },
}
