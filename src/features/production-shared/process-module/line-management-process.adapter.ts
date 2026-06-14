import type {
  ProductionLine,
  ProductionJobCategory,
  ProductionSegment,
} from '../data/production-line'
import type {
  ProcessCardConfig,
  ProcessFieldConfig,
  ProcessModuleConfig,
  ProcessModuleStatus,
  ProcessTreeNodeConfig,
} from './config'

const LEVEL1_BADGE_PREFIX = 'L1'
const LEVEL2_BADGE_PREFIX = 'L2'
const LEVEL3_BADGE_PREFIX = 'L3'

function toStatus(
  isActive?: boolean,
  hasProcesses?: boolean
): ProcessModuleStatus {
  if (!isActive) return 'idle'
  if (hasProcesses) return 'active'
  return 'blocked'
}

function buildProcessTree(
  jobCategory: ProductionJobCategory
): ProcessTreeNodeConfig {
  return {
    key: jobCategory.id,
    label: jobCategory.name,
    meta: `${jobCategory.processes.length} 个末级节点`,
    status: jobCategory.processes.length > 0 ? 'normal' : 'warning',
    children: jobCategory.processes.map((process) => ({
      key: process.id,
      label: process.name,
      meta: process.code || process.description || '末级节点',
      status: process.isActive === false ? 'warning' : 'normal',
    })),
  }
}

function buildSegmentFields(
  line: ProductionLine,
  segment: ProductionSegment,
  jobCategoryCount: number,
  processCount: number
): ProcessFieldConfig[] {
  const jobCategoryNames = segment.jobCategories
    .map((jobCategory) => jobCategory.name)
    .filter(Boolean)
  const processNames = segment.jobCategories
    .flatMap((jobCategory) =>
      jobCategory.processes.map((process) => process.name)
    )
    .filter(Boolean)

  return [
    {
      key: 'line',
      label: '产线',
      value: line.name,
      tone: 'accent',
      width: 'md',
    },
    {
      key: 'segment',
      label: '一级名称',
      value: segment.name,
      tone: 'accent',
      width: 'md',
    },
    {
      key: 'jobs',
      label: '二级节点数',
      value: String(jobCategoryCount),
      tone: 'muted',
      width: 'sm',
    },
    {
      key: 'processes',
      label: '末级节点数',
      value: String(processCount),
      tone: processCount > 0 ? 'accent' : 'danger',
      width: 'sm',
    },
    {
      key: 'segmentDesc',
      label: '一级说明',
      value: segment.description || '无说明',
      tone: 'muted',
      width: 'lg',
    },
    {
      key: 'jobsList',
      label: '二级节点清单',
      value:
        jobCategoryNames.length > 0
          ? jobCategoryNames.slice(0, 3).join(' / ')
          : '无二级节点',
      tone: 'muted',
      width: 'lg',
    },
    {
      key: 'processList',
      label: '末级节点清单',
      value:
        processNames.length > 0
          ? processNames.slice(0, 4).join(' / ')
          : '无末级节点',
      tone: processCount > 0 ? 'accent' : 'danger',
      width: 'lg',
    },
  ]
}

export function buildLineManagementProcessModuleConfig(
  lines: ProductionLine[]
): ProcessModuleConfig {
  const cards: ProcessCardConfig[] = lines.flatMap((line) =>
    line.segments.map((segment, segmentIndex) => {
      const jobCategoryCount = segment.jobCategories.length
      const processCount = segment.jobCategories.reduce(
        (count, jobCategory) => count + jobCategory.processes.length,
        0
      )
      const hasProcesses = processCount > 0
      const status = toStatus(line.isActive, hasProcesses)
      const tree: ProcessTreeNodeConfig[] =
        segment.jobCategories.map(buildProcessTree)
      const allFields = buildSegmentFields(
        line,
        segment,
        jobCategoryCount,
        processCount
      )

      return {
        id: `${line.id}-${segment.id}`,
        code: `${line.code}-${String(segment.sortOrder ?? segmentIndex + 1).padStart(2, '0')}`,
        name: segment.name,
        status,
        badges: [
          { label: line.code, tone: 'text-cyan-600' },
          {
            label: `${LEVEL1_BADGE_PREFIX} ${segmentIndex + 1}`,
            tone: 'text-amber-600',
          },
          {
            label: `${LEVEL2_BADGE_PREFIX} ${jobCategoryCount}`,
            tone: 'text-slate-600',
          },
          {
            label: `${LEVEL3_BADGE_PREFIX} ${processCount}`,
            tone: processCount > 0 ? 'text-slate-600' : 'text-rose-600',
          },
        ],
        sections: [
          { title: '基础信息', fields: allFields.slice(0, 4) },
          { title: '层级节点', fields: allFields.slice(4, 7) },
          { title: '二级与末级节点树', tree },
        ],
      }
    })
  )

  return {
    title: '产线管理层级模块',
    subtitle:
      'LEVEL 1 / LEVEL 2 / LEVEL 3 FULL MAPPING FROM /production-architecture/line',
    cards,
  }
}
