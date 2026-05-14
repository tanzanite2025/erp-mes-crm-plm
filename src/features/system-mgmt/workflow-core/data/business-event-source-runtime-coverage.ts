const CONNECTED_SOURCE_CODES = new Set([
  'SALES_ORDER',
  'PURCHASE_ORDER',
  'QUALITY_STANDARD',
])

const PRECONNECTED_SOURCE_CODES = new Set([
  'PRODUCTION_PLAN',
  'PRODUCTION_TASK',
])

const TEMPLATE_ONLY_SOURCE_CODES = new Set(['LOGISTICS_RECORD', 'BOM'])

export type BusinessEventSourceRuntimeCoverage =
  | 'connected'
  | 'preconnected'
  | 'template-only'
  | 'not-connected'

export function getBusinessEventSourceRuntimeCoverage(sourceCode: string) {
  const normalizedCode = sourceCode.trim().toUpperCase()

  if (CONNECTED_SOURCE_CODES.has(normalizedCode)) {
    return {
      status: 'connected' as const,
      label: '已接入执行链',
      description:
        '这类事件源已经接入真实通知与审批执行链，配置规则后可以实际触发。',
      className:
        'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50',
    }
  }

  if (PRECONNECTED_SOURCE_CODES.has(normalizedCode)) {
    return {
      status: 'preconnected' as const,
      label: '预接入，待 APS 确认',
      description:
        '技术链路已经准备好，但 APS、生产计划和生产任务的最终业务定义还没有确认，不应视为生产业务已闭环。',
      className:
        'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-50',
    }
  }

  if (TEMPLATE_ONLY_SOURCE_CODES.has(normalizedCode)) {
    return {
      status: 'template-only' as const,
      label: '仅模板预置',
      description:
        '这类事件源目前只有模板骨架，规则可配置，但业务模块还没有接入真实触发链。',
      className:
        'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50',
    }
  }

  return {
    status: 'not-connected' as const,
    label: '未接入执行链',
    description:
      '这类事件源还没有接入真实执行链，通常需要先确认业务状态来源和触发入口。',
    className:
      'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-50',
  }
}

export function countConnectedBusinessEventSources(sourceCodes: string[]) {
  return sourceCodes.filter(
    (sourceCode) =>
      getBusinessEventSourceRuntimeCoverage(sourceCode).status === 'connected'
  ).length
}

export function countPreconnectedBusinessEventSources(sourceCodes: string[]) {
  return sourceCodes.filter(
    (sourceCode) =>
      getBusinessEventSourceRuntimeCoverage(sourceCode).status ===
      'preconnected'
  ).length
}
