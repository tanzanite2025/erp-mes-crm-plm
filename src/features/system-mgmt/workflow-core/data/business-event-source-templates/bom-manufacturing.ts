import { type BusinessEventSourceTemplate } from '../business-event-source-types'

/**
 * 生产 BOM (MBOM) 业务事件源模板。
 *
 * 业务模型：
 * - MBOM 由已 RELEASED 的 EBOM **纯复制派生**，派生即生效（EFFECTIVE），无草稿/审批中间态。
 * - MBOM 没有自己的设计审批；EBOM 在设计侧已经审过了。
 * - MBOM 版本可以独立升级（场景：损耗系数 / 工序优化），不影响 EBOM。
 *   工艺师创建 MBOM 新版本时旧版自动 OBSOLETE。
 * - MBOM 通过两个标志位向外暴露"研发优化进度"：
 *     hasPendingRevision：同 productId 存在 EBOM 草稿/审核中（提示生产端：即将有变更）
 *     isStale：sourceEbomId 对应的 EBOM 已被升级（提示工艺端：必须重新派生）
 *   这两个标志由后端按规则计算，触发对应事件让通知中心可以监听。
 *
 * 状态字典：仅 EFFECTIVE / OBSOLETE 两态。
 *
 * 实时入口在 use-bom-write-actions.ts 中按 bomType 派发到本事件源；
 * deriveMBOMFromEBOM 成功时派发 CREATED_FROM_EBOM 动作。
 */
export const DEFAULT_BOM_MANUFACTURING_EVENT_SOURCE: BusinessEventSourceTemplate =
  {
    code: 'BOM_MANUFACTURING',
    name: '生产 BOM (MBOM)',
    module: 'Manufacturing',
    entity: 'BOM',
    enabled: true,
    description:
      '生产 BOM 派生、独立版本升级、研发优化跟踪与作废等生命周期事件。',
    config: {
      actions: [
        { code: 'CREATED_FROM_EBOM', name: '由 EBOM 派生', kind: 'created' },
        { code: 'STATUS_CHANGED', name: '状态变更', kind: 'status' },
        { code: 'REVISED', name: '工艺修订（产生新版本）', kind: 'custom' },
        {
          code: 'MARKED_PENDING_REVISION',
          name: '研发优化中（关联 EBOM 在升级）',
          kind: 'custom',
        },
        {
          code: 'CLEARED_PENDING_REVISION',
          name: '清除研发优化中标志',
          kind: 'custom',
        },
        {
          code: 'MARKED_STALE',
          name: 'EBOM 已升级，待跟进',
          kind: 'custom',
        },
        { code: 'OBSOLETED', name: '作废', kind: 'custom' },
      ],
      statuses: [{ code: 'EFFECTIVE' }, { code: 'OBSOLETE' }],
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
          key: 'sourceEbomId',
          label: '源 EBOM ID',
          path: 'sourceEbomId',
          type: 'string',
          templateKey: 'SourceEbomId',
          templateEnabled: true,
          dynamicResolver: false,
        },
        {
          key: 'sourceEbomNo',
          label: '源 EBOM 编号',
          path: 'sourceEbomNo',
          type: 'string',
          templateKey: 'SourceEbomNo',
          templateEnabled: true,
          dynamicResolver: false,
        },
        {
          key: 'sourceEbomVersion',
          label: '源 EBOM 版本',
          path: 'sourceEbomVersion',
          type: 'string',
          templateKey: 'SourceEbomVersion',
          templateEnabled: true,
          dynamicResolver: false,
        },
        {
          key: 'previousVersion',
          label: '上一版本号',
          path: 'previousVersion',
          type: 'string',
          templateKey: 'PreviousVersion',
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
          key: 'currentVersionId',
          label: '当前 MBOM 版本快照 ID',
          path: 'currentVersionId',
          type: 'string',
          templateKey: 'CurrentVersionId',
          templateEnabled: true,
          dynamicResolver: false,
        },
        {
          key: 'pendingRevisionEbomVersionId',
          label: '研发优化中的 EBOM 版本快照 ID',
          path: 'pendingRevisionEbomVersionId',
          type: 'string',
          templateKey: 'PendingRevisionEbomVersionId',
          templateEnabled: true,
          dynamicResolver: false,
        },
        {
          key: 'pendingRevisionEbomId',
          label: '研发优化中的 EBOM ID',
          path: 'pendingRevisionEbomId',
          type: 'string',
          templateKey: 'PendingRevisionEbomId',
          templateEnabled: true,
          dynamicResolver: false,
        },
        {
          key: 'processEngineer',
          label: '工艺工程师',
          path: 'processEngineer',
          type: 'user',
          templateKey: 'ProcessEngineer',
          templateEnabled: true,
          dynamicResolver: true,
        },
        {
          key: 'productionPlanner',
          label: '生产计划员',
          path: 'productionPlanner',
          type: 'user',
          templateKey: 'ProductionPlanner',
          templateEnabled: true,
          dynamicResolver: true,
        },
        {
          key: 'reason',
          label: '修订原因',
          path: 'reason',
          type: 'string',
          templateKey: 'Reason',
          templateEnabled: true,
          dynamicResolver: false,
        },
      ],
      dynamicResolvers: [
        {
          code: 'processEngineer',
          label: '工艺工程师',
          path: 'processEngineer',
          type: 'user',
        },
        {
          code: 'productionPlanner',
          label: '生产计划员',
          path: 'productionPlanner',
          type: 'user',
        },
      ],
      defaultActionUrlTemplate:
        '/product-structure/bom?bomId=[BomId]&bomType=MBOM',
    },
    meta: {
      runtimeCoverage: 'connected',
      notificationType: 'BOM_EVENT',
      forceStatusChangedAction: false,
      seedAsFallback: false,
    },
  }
