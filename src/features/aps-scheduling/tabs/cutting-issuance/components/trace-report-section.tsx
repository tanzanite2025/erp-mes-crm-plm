import { Button } from '@/components/ui/button'
import type { CuttingIssuanceTraceReport } from '../types'
import { APS_CARD_SHELL_CLASS, APS_KICKER_CLASS, APS_OUTLINE_BUTTON_CLASS, APS_PANEL_CLASS } from '../ui-classes'
import { formatDateLabel, formatNumber } from '../utils'

type TraceReportSectionProps = {
  traceReport: CuttingIssuanceTraceReport | undefined
  isRefreshing: boolean
  onRefresh: () => void
}

export function TraceReportSection(props: TraceReportSectionProps) {
  const { traceReport, isRefreshing, onRefresh } = props

  return (
    <section className={`${APS_CARD_SHELL_CLASS} p-4`}>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <p className={APS_KICKER_CLASS}>Trace Report</p>
          <h3 className='mt-1 text-sm font-black tracking-tight text-foreground'>追溯统计</h3>
          <p className='mt-1 text-xs text-muted-foreground/80'>按当前筛选条件实时汇总执行单、批次、圈数和裁纱行数。</p>
        </div>
        <Button variant='outline' className={APS_OUTLINE_BUTTON_CLASS} onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? '刷新中...' : '刷新'}
        </Button>
      </div>

      <div className='mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6'>
        <div className={`${APS_PANEL_CLASS} p-2.5`}>
          <p className={APS_KICKER_CLASS}>执行单数</p>
          <p className='mt-2 text-2xl font-black tracking-tight text-cyan-700'>{formatNumber(traceReport?.summary.executionCount)}</p>
        </div>
        <div className={`${APS_PANEL_CLASS} p-2.5`}>
          <p className={APS_KICKER_CLASS}>订单数</p>
          <p className='mt-2 text-2xl font-black tracking-tight text-cyan-700'>{formatNumber(traceReport?.summary.orderCount)}</p>
        </div>
        <div className={`${APS_PANEL_CLASS} p-2.5`}>
          <p className={APS_KICKER_CLASS}>批次数</p>
          <p className='mt-2 text-2xl font-black tracking-tight text-cyan-700'>{formatNumber(traceReport?.summary.batchCount)}</p>
        </div>
        <div className={`${APS_PANEL_CLASS} p-2.5`}>
          <p className={APS_KICKER_CLASS}>总圈数</p>
          <p className='mt-2 text-2xl font-black tracking-tight text-cyan-700'>
            {formatNumber(traceReport?.summary.totalRimQuantity)}
          </p>
        </div>
        <div className={`${APS_PANEL_CLASS} p-2.5`}>
          <p className={APS_KICKER_CLASS}>总裁纱行数</p>
          <p className='mt-2 text-2xl font-black tracking-tight text-cyan-700'>
            {formatNumber(traceReport?.summary.totalLineQuantity)}
          </p>
        </div>
        <div className={`${APS_PANEL_CLASS} p-2.5`}>
          <p className={APS_KICKER_CLASS}>时间范围</p>
          <p className='mt-2 text-xs font-semibold text-foreground/85'>{formatDateLabel(traceReport?.summary.earliestCreatedAt)}</p>
          <p className='text-xs font-semibold text-foreground/85'>{formatDateLabel(traceReport?.summary.latestCreatedAt)}</p>
        </div>
      </div>

      <div className='mt-3 grid gap-3 xl:grid-cols-2'>
        <div className='overflow-x-auto rounded-2xl border border-dashed border-muted/50'>
          <table className='w-full min-w-[420px] text-sm'>
            <thead className='bg-muted/30 text-left'>
              <tr>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>状态</th>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>执行单数</th>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>总圈数</th>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>总裁纱行数</th>
              </tr>
            </thead>
            <tbody>
              {traceReport?.byStatus.length ? (
                traceReport.byStatus.map((item) => (
                  <tr key={item.status || 'UNKNOWN'} className='border-t border-border/50'>
                    <td className='px-4 py-2'>{item.status || '--'}</td>
                    <td className='px-4 py-2'>{formatNumber(item.executionCount)}</td>
                    <td className='px-4 py-2'>{formatNumber(item.totalRimQuantity)}</td>
                    <td className='px-4 py-2'>{formatNumber(item.totalLineQuantity)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className='px-4 py-4 text-center text-xs text-muted-foreground/70'>
                    尚未形成状态统计，执行单生成后会自动汇总到这里。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className='overflow-x-auto rounded-2xl border border-dashed border-muted/50'>
          <table className='w-full min-w-[520px] text-sm'>
            <thead className='bg-muted/30 text-left'>
              <tr>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>型号</th>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>孔数</th>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>执行单数</th>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>总圈数</th>
                <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>总裁纱行数</th>
              </tr>
            </thead>
            <tbody>
              {traceReport?.byModel.length ? (
                traceReport.byModel.map((item) => (
                  <tr key={`${item.productModel || 'UNKNOWN'}-${item.holeCount}`} className='border-t border-border/50'>
                    <td className='px-4 py-2'>{item.productModel || '--'}</td>
                    <td className='px-4 py-2'>{item.holeCount || '--'}</td>
                    <td className='px-4 py-2'>{formatNumber(item.executionCount)}</td>
                    <td className='px-4 py-2'>{formatNumber(item.totalRimQuantity)}</td>
                    <td className='px-4 py-2'>{formatNumber(item.totalLineQuantity)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className='px-4 py-4 text-center text-xs text-muted-foreground/70'>
                    尚未形成型号统计，执行单生成后会自动汇总到这里。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
