import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import { cloneBusinessEventSourceConfig } from './business-event-source-card-model'
import { type BusinessEventSourceSection } from './business-event-source-card-diff'

const SOURCE_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/
const TOKEN_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/

type ValidationBySection = Record<BusinessEventSourceSection, string[]>

export function cloneBusinessEventSource(
  source: BusinessEventSource
): BusinessEventSource {
  return {
    ...source,
    config: cloneBusinessEventSourceConfig(source.config),
  }
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const value of values) {
    const normalized = value.trim()
    if (!normalized) continue
    if (seen.has(normalized)) duplicates.add(normalized)
    seen.add(normalized)
  }
  return Array.from(duplicates)
}

function collectBusinessEventSourceValidation(
  source: BusinessEventSource
): ValidationBySection {
  const errors: ValidationBySection = {
    general: [],
    actions: [],
    statuses: [],
    fields: [],
    dynamicResolvers: [],
  }

  if (!source.name.trim()) errors.general.push('事件源名称不能为空')
  if (!source.code.trim()) {
    errors.general.push('事件源编码不能为空')
  } else if (!SOURCE_CODE_PATTERN.test(source.code.trim())) {
    errors.general.push(
      '事件源编码必须使用大写字母、数字和下划线，并以字母开头'
    )
  }
  if (!source.module.trim()) errors.general.push('模块不能为空')

  if (source.config.actions.length === 0) errors.actions.push('至少需要一个动作')
  if (source.config.statuses.length === 0)
    errors.statuses.push('至少需要一个状态')

  source.config.actions.forEach((action, index) => {
    if (!action.id?.trim()) errors.actions.push(`第 ${index + 1} 个动作缺少稳定 ID`)
    if (typeof action.order !== 'number')
      errors.actions.push(`第 ${index + 1} 个动作缺少排序值`)
    if (!action.code.trim()) errors.actions.push(`第 ${index + 1} 个动作编码不能为空`)
    if (!action.name.trim()) errors.actions.push(`第 ${index + 1} 个动作名称不能为空`)
  })
  findDuplicates(source.config.actions.map((action) => action.id ?? '')).forEach(
    (id) => errors.actions.push(`动作 ID 重复：${id}`)
  )
  findDuplicates(source.config.actions.map((action) => action.code)).forEach(
    (code) => errors.actions.push(`动作编码重复：${code}`)
  )

  source.config.statuses.forEach((status, index) => {
    if (!status.id?.trim())
      errors.statuses.push(`第 ${index + 1} 个状态缺少稳定 ID`)
    if (typeof status.order !== 'number')
      errors.statuses.push(`第 ${index + 1} 个状态缺少排序值`)
    if (!status.code.trim()) errors.statuses.push(`第 ${index + 1} 个状态编码不能为空`)
    if (!status.label.trim())
      errors.statuses.push(`第 ${index + 1} 个状态名称不能为空`)
  })
  findDuplicates(source.config.statuses.map((status) => status.id ?? '')).forEach(
    (id) => errors.statuses.push(`状态 ID 重复：${id}`)
  )
  findDuplicates(source.config.statuses.map((status) => status.code)).forEach(
    (code) => errors.statuses.push(`状态编码重复：${code}`)
  )

  source.config.fields.forEach((field, index) => {
    if (!field.id?.trim()) errors.fields.push(`第 ${index + 1} 个字段缺少稳定 ID`)
    if (typeof field.order !== 'number')
      errors.fields.push(`第 ${index + 1} 个字段缺少排序值`)
    if (!field.key.trim()) errors.fields.push(`第 ${index + 1} 个字段 key 不能为空`)
    if (!field.label.trim()) errors.fields.push(`第 ${index + 1} 个字段名称不能为空`)
    if (!field.path.trim()) errors.fields.push(`第 ${index + 1} 个字段 path 不能为空`)
    if (field.templateEnabled) {
      if (!field.templateKey?.trim()) {
        errors.fields.push(`第 ${index + 1} 个模板字段缺少模板变量名`)
      } else if (!TOKEN_PATTERN.test(field.templateKey.trim())) {
        errors.fields.push(
          `模板变量 ${field.templateKey} 只能使用字母、数字和下划线，并以字母开头`
        )
      }
    }
    if (field.dynamicResolver && field.type !== 'user') {
      errors.fields.push(`字段 ${field.key} 标记为动态接收人时，类型应为 user`)
    }
  })
  findDuplicates(source.config.fields.map((field) => field.id ?? '')).forEach(
    (id) => errors.fields.push(`字段 ID 重复：${id}`)
  )
  findDuplicates(source.config.fields.map((field) => field.key)).forEach((key) =>
    errors.fields.push(`字段 key 重复：${key}`)
  )

  source.config.dynamicResolvers.forEach((resolver, index) => {
    if (!resolver.id?.trim())
      errors.dynamicResolvers.push(`第 ${index + 1} 个动态来源缺少稳定 ID`)
    if (typeof resolver.order !== 'number')
      errors.dynamicResolvers.push(`第 ${index + 1} 个动态来源缺少排序值`)
    if (!resolver.code.trim())
      errors.dynamicResolvers.push(`第 ${index + 1} 个动态来源编码不能为空`)
    if (!resolver.label.trim())
      errors.dynamicResolvers.push(`第 ${index + 1} 个动态来源名称不能为空`)
    if (!resolver.path.trim())
      errors.dynamicResolvers.push(`第 ${index + 1} 个动态来源 path 不能为空`)
  })
  findDuplicates(
    source.config.dynamicResolvers.map((resolver) => resolver.id ?? '')
  ).forEach((id) =>
    errors.dynamicResolvers.push(`动态接收人来源 ID 重复：${id}`)
  )
  findDuplicates(
    source.config.dynamicResolvers.map((resolver) => resolver.code)
  ).forEach((code) =>
    errors.dynamicResolvers.push(`动态接收人来源重复：${code}`)
  )

  return errors
}

export function validateBusinessEventSource(source: BusinessEventSource) {
  return [
    ...collectBusinessEventSourceValidation(source).general,
    ...collectBusinessEventSourceValidation(source).actions,
    ...collectBusinessEventSourceValidation(source).statuses,
    ...collectBusinessEventSourceValidation(source).fields,
    ...collectBusinessEventSourceValidation(source).dynamicResolvers,
  ]
}

export function validateBusinessEventSourceSection(
  source: BusinessEventSource,
  section: BusinessEventSourceSection
) {
  return collectBusinessEventSourceValidation(source)[section]
}
