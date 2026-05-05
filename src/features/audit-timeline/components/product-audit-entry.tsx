import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'
import { type Product, type ProductAttributeCategory, type ProductAttributeOption } from '@/features/engineering/data/schema'
import { ProductCoreService } from '@/features/engineering/services/product-core-service'
import {
  AuditEntryColumnCard,
  AuditEntryColumns,
  AuditEntryShell,
  AuditEntrySummaryList,
} from './audit-entry-shell'
import type { AuditLog } from '../types'
import {
  buildProductAuditSummary,
  buildProductStructuredDiffRows,
  formatProductAuditDisplayText,
} from '../utils/product-audit'

function formatProductFieldLabel(field: string, alias: string, locale: string): string {
  switch (field) {
    case 'name':
      return locale === 'zh-CN' ? '产品名称' : 'Product Name'
    case 'sku':
      return 'SKU'
    case 'modelCode':
      return locale === 'zh-CN' ? '型号编码' : 'Model Code'
    case 'typeId':
      return locale === 'zh-CN' ? '产品分类' : 'Product Type'
    case 'techSeries':
      return locale === 'zh-CN' ? '技术系列' : 'Tech Series'
    case 'tireType':
      return locale === 'zh-CN' ? '胎型适配' : 'Tire Compatibility'
    case 'brakeType':
      return locale === 'zh-CN' ? '刹车方式' : 'Brake Type'
    case 'weight':
      return locale === 'zh-CN' ? '目标重量' : 'Target Weight'
    case 'status':
      return locale === 'zh-CN' ? '生命周期状态' : 'Lifecycle Status'
    case 'version':
      return locale === 'zh-CN' ? '版本' : 'Version'
    case 'description':
      return locale === 'zh-CN' ? '描述' : 'Description'
    case 'depth':
      return locale === 'zh-CN' ? '深度' : 'Depth'
    case 'widthInternal':
      return locale === 'zh-CN' ? '内宽' : 'Internal Width'
    case 'widthExternal':
      return locale === 'zh-CN' ? '外宽' : 'External Width'
    case 'angle':
      return locale === 'zh-CN' ? '角度' : 'Angle'
    case 'offset':
      return locale === 'zh-CN' ? '偏移量' : 'Offset'
    case 'moldGroup':
      return locale === 'zh-CN' ? '模具组' : 'Mold Group'
    case 'engineeringSpecId':
      return locale === 'zh-CN' ? '工程规格' : 'Engineering Spec'
    case 'attributeValues':
      return locale === 'zh-CN' ? '属性绑定' : 'Attribute Values'
    case 'techSpecs':
      return locale === 'zh-CN' ? '技术规格' : 'Tech Specs'
    case 'barcodeConfig':
      return locale === 'zh-CN' ? '条码配置' : 'Barcode Config'
    case 'attachments':
      return locale === 'zh-CN' ? '附件' : 'Attachments'
    case 'restrictions':
      return locale === 'zh-CN' ? '约束条件' : 'Restrictions'
    case 'baseModel':
      return locale === 'zh-CN' ? '基础模型' : 'Base Model'
    default:
      return alias || field
  }
}

function EmptyText({ text }: { text: string }) {
  return <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{text}</span>
}

function getLocalizedCategoryName(locale: string, category?: ProductAttributeCategory): string {
  if (!category) {
    return '—'
  }

  if (locale === 'en-US') {
    return category.nameEn?.trim() || category.nameZh || category.key || '—'
  }

  return category.nameZh || category.nameEn || category.key || '—'
}

function getLocalizedOptionLabel(locale: string, option?: ProductAttributeOption): string {
  if (!option) {
    return '—'
  }

  if (locale === 'en-US') {
    return option.labelEn?.trim() || option.labelZh || option.value || '—'
  }

  return option.labelZh || option.labelEn || option.value || '—'
}

function resolveStructuredRowLabel(
  field: string,
  rowKey: string,
  locale: string,
  categoriesByKey: ReadonlyMap<string, ProductAttributeCategory>,
): string {
  if (field === 'attributeValues') {
    return getLocalizedCategoryName(locale, categoriesByKey.get(rowKey))
  }

  if (field === 'attachments') {
    return locale === 'zh-CN' ? '附件清单' : 'Attachment List'
  }

  if (field === 'restrictions') {
    return locale === 'zh-CN' ? '约束条件' : 'Restrictions'
  }

  return formatProductFieldLabel(rowKey, rowKey, locale)
}

function resolveStructuredRowValue(
  field: string,
  rawValue: string,
  locale: string,
  optionsByCategoryAndValue: ReadonlyMap<string, ProductAttributeOption>,
  categoryKey?: string,
): string {
  if (rawValue === '—') {
    return rawValue
  }

  if (field === 'attributeValues' && categoryKey) {
    return getLocalizedOptionLabel(locale, optionsByCategoryAndValue.get(`${categoryKey}::${rawValue}`))
  }

  return rawValue
}

export function ProductAuditEntry({
  log,
  actionLabel,
  attributeCategories,
  attributeOptions,
  products,
}: {
  log: AuditLog
  actionLabel: string
  attributeCategories: ProductAttributeCategory[]
  attributeOptions: ProductAttributeOption[]
  products: Product[]
}) {
  const { locale, t } = useLanguage()
  const summary = useMemo(() => buildProductAuditSummary(log), [log])
  const categoriesByKey = useMemo(
    () => new Map(attributeCategories.map((category) => [category.key, category])),
    [attributeCategories],
  )
  const optionsByCategoryAndValue = useMemo(
    () => new Map(attributeOptions.map((option) => [`${option.categoryKey}::${option.value}`, option])),
    [attributeOptions],
  )
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )
  const targetProduct = productsById.get(log.target_id)
  const targetDisplayName = targetProduct
    ? ProductCoreService.formatDisplay(targetProduct)
    : summary.targetName || log.target_id || (locale === 'zh-CN' ? '未命名产品' : 'Unnamed Product')
  const summaryItems = [
    {
      label: locale === 'zh-CN' ? '产品对象' : 'Product',
      value: targetDisplayName,
    },
    {
      label: 'SKU',
      value: summary.targetSku || '—',
    },
    {
      label: locale === 'zh-CN' ? '产品分类' : 'Product Type',
      value: summary.targetTypeId || '—',
    },
    {
      label: locale === 'zh-CN' ? '总变更数' : 'Total Changes',
      value: String(summary.totalChanges),
    },
    {
      label: locale === 'zh-CN' ? '基础字段变更' : 'Scalar Changes',
      value: String(summary.basicChanges.length),
    },
    {
      label: locale === 'zh-CN' ? '结构字段变更' : 'Structured Changes',
      value: String(summary.structuredChanges.length),
    },
    {
      label: locale === 'zh-CN' ? '操作 IP' : 'Operator IP',
      value: log.ip || '—',
    },
  ]
  const changedFieldBadges = [...summary.basicChanges, ...summary.structuredChanges].slice(0, 8)
  const emptyText = locale === 'zh-CN' ? '暂无可展示变更' : 'No changes to display'
  const structuredChangeGroups = useMemo(
    () => summary.structuredChanges.map((change) => ({
      change,
      rows: buildProductStructuredDiffRows(change),
    })).filter((item) => item.rows.length > 0),
    [summary.structuredChanges],
  )

  return (
    <AuditEntryShell
      actionLabel={actionLabel}
      operator={log.operator}
      createdAt={log.created_at}
      targetLabel={locale === 'zh-CN' ? '产品' : 'Product'}
      targetValue={targetDisplayName}
      headerBadges={(
        <>
          <Badge
            variant='outline'
            className='rounded-full border-dashed border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black tracking-tight text-slate-800'
          >
            {t('common.audit.product.scalarBadge')} {summary.basicChanges.length}
          </Badge>
          <Badge
            variant='outline'
            className='rounded-full border-dashed border-indigo-500/20 bg-indigo-500/5 px-2.5 py-1 text-[10px] font-black tracking-tight text-indigo-700'
          >
            {t('common.audit.product.structuredBadge')} {summary.structuredChanges.length}
          </Badge>
        </>
      )}
    >
      <AuditEntryColumns>
        <AuditEntryColumnCard
          title={locale === 'zh-CN' ? '基础字段变更' : 'Scalar Field Changes'}
          count={summary.basicChanges.length}
          scrollHeightClassName='h-[220px]'
        >
          {summary.basicChanges.length > 0 ? (
            summary.basicChanges.map((item) => (
              <div key={`${item.field}-${item.alias}`} className='rounded-2xl border border-dashed bg-background p-3'>
                <div className='flex items-center justify-between gap-2'>
                  <div className='text-[10px] font-black tracking-tight text-slate-800'>
                    {formatProductFieldLabel(item.field, item.alias, locale)}
                  </div>
                  <Badge variant='outline' className='rounded-full border-dashed bg-white text-[8px] font-mono text-slate-600'>
                    {item.field}
                  </Badge>
                </div>
                <div className='mt-2 grid grid-cols-1 gap-2'>
                  <div className='rounded-xl border border-dashed border-destructive/10 bg-destructive/5 p-2'>
                    <div className='text-[7px] font-black uppercase tracking-widest text-destructive/60'>
                      {t('common.audit.before')}
                    </div>
                    <div className='mt-1 break-all text-[10px] font-mono text-destructive'>
                      {formatProductAuditDisplayText(item.before)}
                    </div>
                  </div>
                  <div className='rounded-xl border border-dashed border-emerald-500/10 bg-emerald-500/5 p-2'>
                    <div className='text-[7px] font-black uppercase tracking-widest text-emerald-700/60'>
                      {t('common.audit.after')}
                    </div>
                    <div className='mt-1 break-all text-[10px] font-mono text-emerald-700'>
                      {formatProductAuditDisplayText(item.after)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyText text={emptyText} />
          )}
        </AuditEntryColumnCard>

        <AuditEntryColumnCard
          title={locale === 'zh-CN' ? '属性与配置变更' : 'Attribute & Config Changes'}
          count={structuredChangeGroups.length}
          scrollHeightClassName='h-[220px]'
        >
          {structuredChangeGroups.length > 0 ? (
            structuredChangeGroups.map(({ change, rows }) => (
              <div key={`${change.field}-${change.alias}`} className='rounded-2xl border border-dashed bg-background p-3'>
                <div className='flex items-center justify-between gap-2'>
                  <div className='text-[10px] font-black tracking-tight text-slate-800'>
                    {formatProductFieldLabel(change.field, change.alias, locale)}
                  </div>
                  <Badge variant='outline' className='rounded-full border-dashed bg-white text-[8px] font-mono text-slate-600'>
                    {rows.length}
                  </Badge>
                </div>
                <div className='mt-2 flex flex-col gap-2'>
                  {rows.map((row) => (
                    <div key={`${change.field}-${row.key}`} className='rounded-xl border border-dashed border-muted/30 bg-muted/5 p-2.5'>
                      <div className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/55'>
                        {resolveStructuredRowLabel(change.field, row.key, locale, categoriesByKey)}
                      </div>
                      <div className='mt-2 grid grid-cols-1 gap-2'>
                        <div className='rounded-xl border border-dashed border-destructive/10 bg-destructive/5 p-2'>
                          <div className='text-[7px] font-black uppercase tracking-widest text-destructive/60'>
                            {t('common.audit.before')}
                          </div>
                          <div className='mt-1 break-all text-[10px] font-mono text-destructive'>
                            {resolveStructuredRowValue(change.field, row.before, locale, optionsByCategoryAndValue, row.key)}
                          </div>
                        </div>
                        <div className='rounded-xl border border-dashed border-emerald-500/10 bg-emerald-500/5 p-2'>
                          <div className='text-[7px] font-black uppercase tracking-widest text-emerald-700/60'>
                            {t('common.audit.after')}
                          </div>
                          <div className='mt-1 break-all text-[10px] font-mono text-emerald-700'>
                            {resolveStructuredRowValue(change.field, row.after, locale, optionsByCategoryAndValue, row.key)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <EmptyText text={emptyText} />
          )}
        </AuditEntryColumnCard>

        <AuditEntryColumnCard title={locale === 'zh-CN' ? '产品审计摘要' : 'Product Audit Summary'}>
          <AuditEntrySummaryList items={summaryItems} />
          <div className='mt-4 border-t border-dashed border-muted/30 pt-4'>
            <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
              {locale === 'zh-CN' ? '变更字段' : 'Changed Fields'}
            </div>
            <div className='mt-3 flex flex-wrap gap-1.5'>
              {changedFieldBadges.length > 0 ? (
                changedFieldBadges.map((item) => (
                  <Badge
                    key={`${item.field}-${item.alias}-badge`}
                    variant='outline'
                    className='rounded-full border-dashed border-slate-200 bg-slate-50 text-[8px] font-mono text-slate-700'
                  >
                    {formatProductFieldLabel(item.field, item.alias, locale)}
                  </Badge>
                ))
              ) : (
                <EmptyText text={emptyText} />
              )}
            </div>
          </div>
        </AuditEntryColumnCard>
      </AuditEntryColumns>
    </AuditEntryShell>
  )
}
