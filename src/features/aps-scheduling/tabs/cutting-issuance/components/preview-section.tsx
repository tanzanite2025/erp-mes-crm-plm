import { Loader2, WandSparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CuttingIssuancePreview } from '../types'
import { APS_CARD_SHELL_CLASS, APS_KICKER_CLASS, APS_PRIMARY_BUTTON_CLASS } from '../ui-classes'

type PreviewSectionProps = {
  preview: CuttingIssuancePreview | undefined
  isSubmitting: boolean
  onCreateExecution: () => void
}

export function PreviewSection(props: PreviewSectionProps) {
  const { preview, isSubmitting, onCreateExecution } = props

  return (
    <section className={`${APS_CARD_SHELL_CLASS} p-4`}>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <p className={APS_KICKER_CLASS}>Batch Preview</p>
          <h3 className='mt-1 text-sm font-black tracking-tight text-foreground'>分批预览（贪婪拆批）</h3>
          <p className='mt-1 text-xs text-muted-foreground/80'>按建议每批圈数自动拆批，后续可升级为手动分批优先。</p>
        </div>
        <Button className={`${APS_PRIMARY_BUTTON_CLASS} gap-2`} onClick={onCreateExecution} disabled={!preview || isSubmitting}>
          {isSubmitting ? <Loader2 className='size-4 animate-spin' /> : <WandSparkles className='size-4' />}
          生成执行单草稿
        </Button>
      </div>

      <div className='mt-3 overflow-x-auto rounded-2xl border border-dashed border-muted/50'>
        <table className='w-full min-w-[560px] text-sm'>
          <thead className='bg-muted/30 text-left'>
            <tr>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>批次</th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>圈数</th>
              <th className='px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/70'>裁纱总行数</th>
            </tr>
          </thead>
          <tbody>
            {preview?.batches.length ? (
              preview.batches.map((batch) => (
                <tr key={batch.batchNo} className='border-t border-border/50'>
                  <td className='px-4 py-2'>第{batch.batchNo}批</td>
                  <td className='px-4 py-2'>{batch.rimQuantity}</td>
                  <td className='px-4 py-2'>{batch.lineQuantity}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className='px-4 py-4 text-center text-xs text-muted-foreground/70'>
                  请先完成上方订单行选择，系统匹配模板后会在这里展示分批结果。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
