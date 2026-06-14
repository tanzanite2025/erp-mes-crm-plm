import { getBusinessEventSourceTemplateByCode } from './business-event-source-templates'

export type BusinessEventSourceRuntimeCoverage =
  | 'connected'
  | 'preconnected'
  | 'template-only'
  | 'not-connected'

interface BusinessEventSourceRuntimeCoverageDescriptor {
  status: BusinessEventSourceRuntimeCoverage
  label: string
  description: string
  className: string
}

const COVERAGE_DESCRIPTORS: Record<
  BusinessEventSourceRuntimeCoverage,
  BusinessEventSourceRuntimeCoverageDescriptor
> = {
  connected: {
    status: 'connected',
    label: '已接入执行链',
    description:
      '这类事件源已经接入真实通知与审批执行链，配置规则后可以实际触发。',
    className:
      'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50',
  },
  preconnected: {
    status: 'preconnected',
    label: '预接入，待业务确认',
    description:
      '技术链路已经准备好，但业务模块的最终业务定义还没有确认，不应视为业务已闭环。',
    className: 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-50',
  },
  'template-only': {
    status: 'template-only',
    label: '仅模板预置',
    description:
      '这类事件源目前只有模板骨架，规则可配置，但业务模块还没有接入真实触发链。',
    className: 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50',
  },
  'not-connected': {
    status: 'not-connected',
    label: '未接入执行链',
    description:
      '这类事件源还没有接入真实执行链，通常需要先确认业务状态来源和触发入口。',
    className: 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-50',
  },
}

export function getBusinessEventSourceRuntimeCoverage(
  sourceCode: string
): BusinessEventSourceRuntimeCoverageDescriptor {
  const template = getBusinessEventSourceTemplateByCode(sourceCode)
  if (!template) {
    return COVERAGE_DESCRIPTORS['not-connected']
  }
  return COVERAGE_DESCRIPTORS[template.meta.runtimeCoverage]
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
