import type { ProductionLine, ProductionJobCategory, ProductionSegment } from '../data/production-line'
import type { ProcessCardConfig, ProcessFieldConfig, ProcessModuleConfig, ProcessModuleStatus, ProcessTreeNodeConfig } from './config'

function toStatus(isActive?: boolean, hasProcesses?: boolean): ProcessModuleStatus {
  if (!isActive) return 'idle'
  if (hasProcesses) return 'active'
  return 'blocked'
}

function buildProcessTree(jobCategory: ProductionJobCategory): ProcessTreeNodeConfig {
  return {
    key: jobCategory.id,
    label: jobCategory.name,
    meta: `${jobCategory.processes.length} 工序`,
    status: jobCategory.processes.length > 0 ? 'normal' : 'warning',
    children: jobCategory.processes.map((process) => ({
      key: process.id,
      label: process.name,
      meta: process.code || process.description || '工序节点',
      status: process.isActive === false ? 'warning' : 'normal',
    })),
  }
}

function buildSegmentFields(
  line: ProductionLine,
  segment: ProductionSegment,
  jobCategoryCount: number,
  processCount: number,
): ProcessFieldConfig[] {
  const jobCategoryNames = segment.jobCategories.map((jobCategory) => jobCategory.name).filter(Boolean)
  const processNames = segment.jobCategories.flatMap((jobCategory) => jobCategory.processes.map((process) => process.name)).filter(Boolean)

  return [
    { key: 'line', label: '产线', value: line.name, tone: 'accent', width: 'md' },
    { key: 'segment', label: '段名称', value: segment.name, tone: 'accent', width: 'md' },
    { key: 'jobs', label: '作业类', value: String(jobCategoryCount), tone: 'muted', width: 'sm' },
    { key: 'processes', label: '工序数', value: String(processCount), tone: processCount > 0 ? 'accent' : 'danger', width: 'sm' },
    { key: 'segmentDesc', label: '段说明', value: segment.description || '无说明', tone: 'muted', width: 'lg' },
    { key: 'jobsList', label: '作业类清单', value: jobCategoryNames.length > 0 ? jobCategoryNames.slice(0, 3).join(' / ') : '无作业类', tone: 'muted', width: 'lg' },
    { key: 'processList', label: '工序清单', value: processNames.length > 0 ? processNames.slice(0, 4).join(' / ') : '无工序', tone: processCount > 0 ? 'accent' : 'danger', width: 'lg' },
  ]
}

export function buildLineManagementProcessModuleConfig(lines: ProductionLine[]): ProcessModuleConfig {
  const cards: ProcessCardConfig[] = lines.flatMap((line) =>
    line.segments.map((segment, segmentIndex) => {
      const jobCategoryCount = segment.jobCategories.length
      const processCount = segment.jobCategories.reduce((count, jobCategory) => count + jobCategory.processes.length, 0)
      const hasProcesses = processCount > 0
      const status = toStatus(line.isActive, hasProcesses)
      const tree: ProcessTreeNodeConfig[] = segment.jobCategories.map(buildProcessTree)
      const allFields = buildSegmentFields(line, segment, jobCategoryCount, processCount)

      return {
        id: `${line.id}-${segment.id}`,
        code: `${line.code}-${String(segment.sortOrder ?? segmentIndex + 1).padStart(2, '0')}`,
        name: segment.name,
        status,
        badges: [
          { label: line.code, tone: 'text-cyan-600' },
          { label: `SEG ${segmentIndex + 1}`, tone: 'text-amber-600' },
          { label: `JOB ${jobCategoryCount}`, tone: 'text-slate-600' },
          { label: `PRC ${processCount}`, tone: processCount > 0 ? 'text-slate-600' : 'text-rose-600' },
        ],
        sections: [
          { title: '基础信息', fields: allFields.slice(0, 4) },
          { title: '作业类', fields: allFields.slice(4, 7) },
          { title: '作业类与工序树', tree },
        ],
      }
    }),
  )

  return {
    title: '产线管理工序模块',
    subtitle: 'SEGMENT / JOB CATEGORY / PROCESS FULL MAPPING FROM /production-architecture/line',
    cards,
  }
}
