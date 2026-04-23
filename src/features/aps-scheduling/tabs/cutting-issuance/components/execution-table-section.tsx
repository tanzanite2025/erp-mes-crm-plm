import { Button } from '@/components/ui/button'
import type { CuttingIssuanceExecutionRecord } from '../types'
import { APS_CARD_SHELL_CLASS, APS_KICKER_CLASS, APS_OUTLINE_BUTTON_CLASS } from '../ui-classes'
import { formatDateLabel } from '../utils'

type ExecutionTableSectionProps = {
  executions: CuttingIssuanceExecutionRecord[]
  isRefreshing: boolean
  onRefresh: () => void
}

export function ExecutionTableSection(props: ExecutionTableSectionProps) {
  const { executions, isRefreshing, onRefresh } = props

  return (
    <section className={`${APS_CARD_SHELL_CLASS} p-4`}>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <p className={APS_KICKER_CLASS}>Execution Records</p>
          <h3 className='mt-1 text-sm font-black tracking-tight text-foreground'>已生成执行单</h3>
          <p className='mt-1 text-xs text-muted-foreground/80'>列表受筛选条件影响，可直接用于排查和追溯核对。</p>
        </div>
        <Button variant='outline' className={APS_OUTLINE_BUTTON_CLASS} onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? '刷新中...' : '刷新'}
        </Button>
      </div>

      <div className='mt-3 overflow-x-auto rounded-2xl border border-dashed border-muted/50'>
        <table className='w-full min-w-[760px] text-sm'>
          <thead className='bg-muted/30 text-left'>
            <tr>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>执行单ID</th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>订单号</th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>订单行</th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>型号/孔数</th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>模板</th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>圈数</th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>总裁纱行数</th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>状态</th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>创建时间</th>
            </tr>
          </thead>
          <tbody>
            {executions.length ? (
              executions.map((record) => (
                <tr key={record.id} className='border-t border-border/50'>
                  <td className='px-4 py-2 font-mono text-xs'>{record.id}</td>
                  <td className='px-4 py-2'>{record.orderNo}</td>
                  <td className='px-4 py-2'>第{record.lineNo}行</td>
                  <td className='px-4 py-2'>
                    {record.productModel} / {record.holeCount || '--'}孔
                  </td>
                  <td className='px-4 py-2'>{record.templateName}</td>
                  <td className='px-4 py-2'>{record.quantity}</td>
                  <td className='px-4 py-2'>{record.totalLineQuantity}</td>
                  <td className='px-4 py-2'>{record.status}</td>
                  <td className='px-4 py-2'>{formatDateLabel(record.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className='px-4 py-4 text-center text-xs text-muted-foreground/70'>
                  还没有符合当前筛选条件的执行单，可调整筛选条件或先生成执行单。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
