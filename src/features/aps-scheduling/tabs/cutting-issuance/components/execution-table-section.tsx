import { useMemo, useState } from 'react'
import { ClipboardList, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/context/language-provider'
import { getProductionPlanStatusLabel, getProductionPlanStatusOptions } from '../constants'
import type { CuttingIssuanceExecutionRecord } from '../types'
import {
  APS_INPUT_CLASS,
  APS_KICKER_CLASS,
  APS_OUTLINE_BUTTON_CLASS,
  APS_SECONDARY_SECTION_CLASS,
  APS_SECONDARY_SECTION_HEADER_CLASS,
  APS_SECONDARY_SECTION_MARKER_CLASS,
  APS_SECTION_HEADER_CLASS,
  APS_SECTION_MARKER_CLASS,
} from '../ui-classes'
import { formatDateLabel } from '../utils'

type ExecutionTableSectionProps = {
  executions: CuttingIssuanceExecutionRecord[]
  isRefreshing: boolean
  onRefresh: () => void
}

function normalizeSearchText(value: string | number | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

export function ExecutionTableSection(props: ExecutionTableSectionProps) {
  const { t, locale } = useLanguage()
  const { executions, isRefreshing, onRefresh } = props
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('ALL')
  const statusOptions = getProductionPlanStatusOptions(t)

  const filteredExecutions = useMemo(() => {
    const normalizedKeyword = normalizeSearchText(keyword)

    return executions.filter((record) => {
      if (status !== 'ALL' && record.status !== status) {
        return false
      }

      if (!normalizedKeyword) {
        return true
      }

      const haystack = [
        record.id,
        record.orderNo,
        t('apsScheduling.cuttingIssuance.execution.lineValue', { lineNo: record.lineNo }),
        record.productModel,
        record.holeCount,
        record.templateName,
        record.totalLineQuantity,
        getProductionPlanStatusLabel(record.status, t),
      ]

      return haystack.some((item) => normalizeSearchText(item).includes(normalizedKeyword))
    })
  }, [executions, keyword, status, t])

  const emptyMessage = executions.length
    ? t('apsScheduling.cuttingIssuance.execution.emptyFiltered')
    : t('apsScheduling.cuttingIssuance.execution.emptyInitial')

  return (
    <section className={`${APS_SECONDARY_SECTION_CLASS} p-4`}>
      <div
        className={`${APS_SECTION_HEADER_CLASS} ${APS_SECONDARY_SECTION_HEADER_CLASS} flex-col gap-3 lg:flex-row lg:items-start lg:justify-between`}
      >
        <div className='flex items-start gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10'>
            <ClipboardList className='size-4' />
          </div>
          <div>
            <span className={`${APS_SECTION_MARKER_CLASS} ${APS_SECONDARY_SECTION_MARKER_CLASS}`}>
              {t('apsScheduling.cuttingIssuance.execution.kicker')}
            </span>
            <h3 className='mt-2 text-base font-black tracking-tight text-slate-950'>
              {t('apsScheduling.cuttingIssuance.execution.title')}
            </h3>
            <p className='mt-1 text-xs text-slate-600/85'>
              {t('apsScheduling.cuttingIssuance.execution.description')}
            </p>
          </div>
        </div>

        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
          <div className='relative min-w-[260px]'>
            <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/45' />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t('apsScheduling.cuttingIssuance.execution.searchPlaceholder')}
              className={`${APS_INPUT_CLASS} pl-10`}
            />
          </div>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className={`${APS_INPUT_CLASS} w-full sm:w-[160px]`}>
              <SelectValue placeholder={t('apsScheduling.cuttingIssuance.execution.statusPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant='outline'
            className={APS_OUTLINE_BUTTON_CLASS}
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing
              ? t('apsScheduling.cuttingIssuance.execution.refreshing')
              : t('common.actions.refresh')}
          </Button>
        </div>
      </div>

      <div className='mt-3 text-xs font-semibold text-muted-foreground/75'>
        {t('apsScheduling.cuttingIssuance.execution.countLabel', {
          count: filteredExecutions.length,
          total: executions.length,
        })}
      </div>

      <div className='mt-3 overflow-x-auto rounded-2xl border border-dashed border-muted/50'>
        <table className='w-full min-w-[720px] text-sm'>
          <thead className='bg-muted/30 text-left'>
            <tr>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                {t('apsScheduling.cuttingIssuance.execution.columns.executionId')}
              </th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                {t('apsScheduling.cuttingIssuance.execution.columns.orderNo')}
              </th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                {t('apsScheduling.cuttingIssuance.execution.columns.lineNo')}
              </th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                {t('apsScheduling.cuttingIssuance.execution.columns.product')}
              </th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                {t('apsScheduling.cuttingIssuance.execution.columns.template')}
              </th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                {t('apsScheduling.cuttingIssuance.execution.columns.totalLineQuantity')}
              </th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                {t('apsScheduling.cuttingIssuance.execution.columns.status')}
              </th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                {t('apsScheduling.cuttingIssuance.execution.columns.createdAt')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredExecutions.length ? (
              filteredExecutions.map((record) => (
                <tr key={record.id} className='border-t border-border/50'>
                  <td className='px-4 py-2 font-mono text-xs'>{record.id}</td>
                  <td className='px-4 py-2'>{record.orderNo}</td>
                  <td className='px-4 py-2'>
                    {t('apsScheduling.cuttingIssuance.execution.lineValue', { lineNo: record.lineNo })}
                  </td>
                  <td className='px-4 py-2'>
                    {t('apsScheduling.cuttingIssuance.execution.modelHoleValue', {
                      productModel: record.productModel,
                      holeCount: record.holeCount || '--',
                    })}
                  </td>
                  <td className='px-4 py-2'>{record.templateName}</td>
                  <td className='px-4 py-2'>{record.totalLineQuantity}</td>
                  <td className='px-4 py-2'>{getProductionPlanStatusLabel(record.status, t)}</td>
                  <td className='px-4 py-2'>{formatDateLabel(record.createdAt, locale)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className='px-4 py-4 text-center text-xs text-muted-foreground/70'>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
