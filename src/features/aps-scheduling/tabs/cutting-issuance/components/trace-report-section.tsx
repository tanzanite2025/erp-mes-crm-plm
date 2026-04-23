import { useState } from 'react'
import { ChartNoAxesCombined, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useLanguage } from '@/context/language-provider'
import { getProductionPlanStatusLabel } from '../constants'
import type { CuttingIssuanceTraceReport } from '../types'
import {
  APS_KICKER_CLASS,
  APS_OUTLINE_BUTTON_CLASS,
  APS_PANEL_CLASS,
  APS_SECTION_HEADER_CLASS,
  APS_SECTION_MARKER_CLASS,
  APS_TERTIARY_SECTION_CLASS,
  APS_TERTIARY_SECTION_HEADER_CLASS,
  APS_TERTIARY_SECTION_MARKER_CLASS,
} from '../ui-classes'
import { formatDateLabel, formatNumber } from '../utils'

type TraceReportSectionProps = {
  traceReport: CuttingIssuanceTraceReport | undefined
  isRefreshing: boolean
  onRefresh: () => void
}

const UNKNOWN_STATUS_KEY = '__unknown_status__'
const UNKNOWN_MODEL_KEY = '__unknown_model__'

export function TraceReportSection(props: TraceReportSectionProps) {
  const { t, locale } = useLanguage()
  const { traceReport, isRefreshing, onRefresh } = props
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={`${APS_TERTIARY_SECTION_CLASS} p-4`}>
      <div
        className={`${APS_SECTION_HEADER_CLASS} ${APS_TERTIARY_SECTION_HEADER_CLASS} flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}
      >
        <div className='flex items-start gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-300 bg-white/80 text-slate-600'>
            <ChartNoAxesCombined className='size-4' />
          </div>
          <div>
            <span className={`${APS_SECTION_MARKER_CLASS} ${APS_TERTIARY_SECTION_MARKER_CLASS}`}>
              {t('apsScheduling.cuttingIssuance.trace.kicker')}
            </span>
            <h3 className='mt-2 text-base font-black tracking-tight text-slate-900'>
              {t('apsScheduling.cuttingIssuance.trace.title')}
            </h3>
            <p className='mt-1 text-xs text-slate-500/90'>
              {t('apsScheduling.cuttingIssuance.trace.description')}
            </p>
            {!isOpen ? (
              <p className='mt-2 text-xs font-semibold text-slate-600/90'>
                {t('apsScheduling.cuttingIssuance.trace.summary.executionCount')} {formatNumber(traceReport?.summary.executionCount, locale)}
                {' / '}
                {t('apsScheduling.cuttingIssuance.trace.summary.orderCount')} {formatNumber(traceReport?.summary.orderCount, locale)}
                {' / '}
                {t('apsScheduling.cuttingIssuance.trace.summary.totalLineQuantity')} {formatNumber(traceReport?.summary.totalLineQuantity, locale)}
              </p>
            ) : null}
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            className={APS_OUTLINE_BUTTON_CLASS}
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing
              ? t('apsScheduling.cuttingIssuance.trace.refreshing')
              : t('common.actions.refresh')}
          </Button>
          <CollapsibleTrigger asChild>
            <Button variant='outline' className={APS_OUTLINE_BUTTON_CLASS}>
              {isOpen ? '收起统计' : '展开统计'}
              <ChevronDown className={`size-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent className='overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
      <div className='mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-5'>
        <div className={`${APS_PANEL_CLASS} bg-white/75 p-2.5`}>
          <p className={APS_KICKER_CLASS}>{t('apsScheduling.cuttingIssuance.trace.summary.executionCount')}</p>
          <p className='mt-2 text-2xl font-black tracking-tight text-slate-800'>
            {formatNumber(traceReport?.summary.executionCount, locale)}
          </p>
        </div>
        <div className={`${APS_PANEL_CLASS} bg-white/75 p-2.5`}>
          <p className={APS_KICKER_CLASS}>{t('apsScheduling.cuttingIssuance.trace.summary.orderCount')}</p>
          <p className='mt-2 text-2xl font-black tracking-tight text-slate-800'>
            {formatNumber(traceReport?.summary.orderCount, locale)}
          </p>
        </div>
        <div className={`${APS_PANEL_CLASS} bg-white/75 p-2.5`}>
          <p className={APS_KICKER_CLASS}>{t('apsScheduling.cuttingIssuance.trace.summary.batchCount')}</p>
          <p className='mt-2 text-2xl font-black tracking-tight text-slate-800'>
            {formatNumber(traceReport?.summary.batchCount, locale)}
          </p>
        </div>
        <div className={`${APS_PANEL_CLASS} bg-white/75 p-2.5`}>
          <p className={APS_KICKER_CLASS}>{t('apsScheduling.cuttingIssuance.trace.summary.totalLineQuantity')}</p>
          <p className='mt-2 text-2xl font-black tracking-tight text-slate-800'>
            {formatNumber(traceReport?.summary.totalLineQuantity, locale)}
          </p>
        </div>
        <div className={`${APS_PANEL_CLASS} bg-white/75 p-2.5`}>
          <p className={APS_KICKER_CLASS}>{t('apsScheduling.cuttingIssuance.trace.summary.timeRange')}</p>
          <p className='mt-2 text-xs font-semibold text-foreground/85'>
            {formatDateLabel(traceReport?.summary.earliestCreatedAt, locale)}
          </p>
          <p className='text-xs font-semibold text-foreground/85'>
            {formatDateLabel(traceReport?.summary.latestCreatedAt, locale)}
          </p>
        </div>
      </div>

      <div className='mt-3 grid gap-3 xl:grid-cols-2'>
        <div className='overflow-x-auto rounded-2xl border border-dashed border-muted/50'>
          <table className='w-full min-w-[360px] text-sm'>
            <thead className='bg-muted/30 text-left'>
              <tr>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                  {t('apsScheduling.cuttingIssuance.trace.columns.status')}
                </th>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                  {t('apsScheduling.cuttingIssuance.trace.columns.executionCount')}
                </th>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                  {t('apsScheduling.cuttingIssuance.trace.columns.totalLineQuantity')}
                </th>
              </tr>
            </thead>
            <tbody>
              {traceReport?.byStatus.length ? (
                traceReport.byStatus.map((item) => (
                  <tr key={item.status || UNKNOWN_STATUS_KEY} className='border-t border-border/50'>
                    <td className='px-4 py-2'>{getProductionPlanStatusLabel(item.status, t)}</td>
                    <td className='px-4 py-2'>{formatNumber(item.executionCount, locale)}</td>
                    <td className='px-4 py-2'>{formatNumber(item.totalLineQuantity, locale)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className='px-4 py-4 text-center text-xs text-muted-foreground/70'>
                    {t('apsScheduling.cuttingIssuance.trace.emptyByStatus')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className='overflow-x-auto rounded-2xl border border-dashed border-muted/50'>
          <table className='w-full min-w-[440px] text-sm'>
            <thead className='bg-muted/30 text-left'>
              <tr>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                  {t('apsScheduling.cuttingIssuance.trace.columns.productModel')}
                </th>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                  {t('apsScheduling.cuttingIssuance.trace.columns.holeCount')}
                </th>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                  {t('apsScheduling.cuttingIssuance.trace.columns.executionCount')}
                </th>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>
                  {t('apsScheduling.cuttingIssuance.trace.columns.totalLineQuantity')}
                </th>
              </tr>
            </thead>
            <tbody>
              {traceReport?.byModel.length ? (
                traceReport.byModel.map((item) => (
                  <tr
                    key={`${item.productModel || UNKNOWN_MODEL_KEY}-${item.holeCount}`}
                    className='border-t border-border/50'
                  >
                    <td className='px-4 py-2'>{item.productModel || '--'}</td>
                    <td className='px-4 py-2'>{item.holeCount || '--'}</td>
                    <td className='px-4 py-2'>{formatNumber(item.executionCount, locale)}</td>
                    <td className='px-4 py-2'>{formatNumber(item.totalLineQuantity, locale)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className='px-4 py-4 text-center text-xs text-muted-foreground/70'>
                    {t('apsScheduling.cuttingIssuance.trace.emptyByModel')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
