import { useLanguage } from '@/context/language-provider'
import { type AuditLog } from '../types'
import { AuditEntryShell } from './audit-entry-shell'

function isProductTemplateAuditSnapshotRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatProductTemplateAuditScalarValue(
  value: unknown,
  isZh: boolean
): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean')
    return value ? (isZh ? '启用' : 'Enabled') : isZh ? '停用' : 'Disabled'
  if (typeof value === 'string' || typeof value === 'number')
    return String(value)
  return JSON.stringify(value)
}

function ProductPhysicalSpecificationTemplateAuditValue({
  field,
  value,
  isZh,
}: {
  field: string
  value: unknown
  isZh: boolean
}) {
  if (field !== 'attributeBindings' || !Array.isArray(value)) {
    return <span>{formatProductTemplateAuditScalarValue(value, isZh)}</span>
  }
  if (value.length === 0)
    return <span>{isZh ? '无规格属性' : 'No attributes'}</span>
  return (
    <div className='space-y-3'>
      {value
        .filter(isProductTemplateAuditSnapshotRecord)
        .map((definition, definitionIndex) => (
          <div
            key={String(definition.categoryKey)}
            className='space-y-1 rounded-xl border border-dashed p-3'
          >
            <p className='font-semibold'>
              {definitionIndex + 1}.{' '}
              {String(definition.nameZh || definition.categoryKey)}
              {definition.nameEn ? ` (${String(definition.nameEn)})` : ''}
            </p>
            <p className='text-xs text-muted-foreground'>
              {definition.required
                ? isZh
                  ? '必填'
                  : 'Required'
                : isZh
                  ? '非必填'
                  : 'Optional'}
              {' · '}
              {formatProductTemplateAuditScalarValue(definition.active, isZh)}
            </p>
            {definition.description ? (
              <p>{String(definition.description)}</p>
            ) : null}
            <ul className='space-y-1 pl-3'>
              {(Array.isArray(definition.options) ? definition.options : [])
                .filter(isProductTemplateAuditSnapshotRecord)
                .map((option, optionIndex) => (
                  <li key={String(option.value)}>
                    {optionIndex + 1}. {String(option.labelZh || option.value)}
                    {option.labelEn ? ` (${String(option.labelEn)})` : ''}
                    {' · '}
                    {formatProductTemplateAuditScalarValue(option.active, isZh)}
                    {option.description
                      ? ` · ${String(option.description)}`
                      : ''}
                  </li>
                ))}
            </ul>
          </div>
        ))}
    </div>
  )
}

export function ProductPhysicalSpecificationTemplateAuditEntry({
  log,
  actionLabel,
}: {
  log: AuditLog
  actionLabel: string
}) {
  const { locale, t } = useLanguage()
  const isZh = locale.startsWith('zh')
  const nameChange = log.diff.find((change) => change.f === 'name')
  const targetName = String(nameChange?.n || nameChange?.o || log.target_id)
  const fieldLabels: Record<string, string> = isZh
    ? {
        name: '模板名称',
        code: '模板编码',
        componentKey: '产品组件',
        description: '说明',
        active: '启用状态',
        version: '记录版本',
        attributeBindings: '规格属性与选项',
      }
    : {
        name: 'Template name',
        code: 'Template code',
        componentKey: 'Product component',
        description: 'Description',
        active: 'Active status',
        version: 'Record version',
        attributeBindings: 'Specification attributes and options',
      }
  return (
    <AuditEntryShell
      actionLabel={actionLabel}
      operator={log.operator}
      createdAt={log.created_at}
      targetLabel={isZh ? '物理规格模板' : 'Specification template'}
      targetValue={targetName}
    >
      <div className='space-y-3 pt-3'>
        {log.diff
          .filter((change) => change.f !== 'name' || change.o !== change.n)
          .map((change) => (
            <section
              key={change.f}
              className='overflow-hidden rounded-2xl border border-dashed bg-muted/5'
            >
              <h4 className='border-b border-dashed px-4 py-2 text-sm font-semibold'>
                {fieldLabels[change.f] || change.a || change.f}
              </h4>
              <div className='grid min-w-0 gap-3 p-3 md:grid-cols-2'>
                {(['before', 'after'] as const).map((side) => (
                  <div
                    key={side}
                    className='min-w-0 space-y-2 rounded-xl bg-muted/20 p-3 text-sm break-words'
                  >
                    <p className='text-xs font-semibold text-muted-foreground'>
                      {t(`common.audit.${side}`)}
                    </p>
                    <ProductPhysicalSpecificationTemplateAuditValue
                      field={change.f}
                      value={side === 'before' ? change.o : change.n}
                      isZh={isZh}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
      </div>
    </AuditEntryShell>
  )
}
