import { ArrowRightLeft, FileDown, MessageCircleMore } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { QuoteDetail } from '@/features/quotes/data/quote-detail'

type QuoteWorkspaceFooterProps = {
  detail: QuoteDetail | null
  isCreateMode: boolean
  isSaving: boolean
  saveDisabled?: boolean
  isConverting: boolean
  transferLabel: string
  transferHelper: string
  onOpenChange: (open: boolean) => void
  onSave: () => void
  onExportPdf: () => void
  onTransfer: () => void
  onConvert: () => void
}

export function QuoteWorkspaceFooter({
  detail,
  isCreateMode,
  isSaving,
  saveDisabled = false,
  isConverting,
  transferLabel,
  transferHelper,
  onOpenChange,
  onSave,
  onExportPdf,
  onTransfer,
  onConvert,
}: QuoteWorkspaceFooterProps) {
  return (
    <div className='border-t border-dashed border-border/60 px-6 py-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-[11px] leading-5 text-muted-foreground'>
          {isCreateMode
            ? '创建完成后可继续在当前工作台执行更多动作。'
            : transferHelper}
        </p>
        <div className='flex flex-wrap items-center justify-end gap-2'>
          <Button
            variant='outline'
            className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
            onClick={() => onOpenChange(false)}
          >
            关闭
          </Button>
          <Button
            variant='outline'
            className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
            onClick={onExportPdf}
            disabled={isCreateMode || !detail}
          >
            <FileDown className='size-4' />
            一键保存 PDF
          </Button>
          <Button
            variant='outline'
            className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
            onClick={onTransfer}
            disabled={isCreateMode || !detail}
          >
            <MessageCircleMore className='size-4' />
            {transferLabel}
          </Button>
          <Button
            variant='outline'
            className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
            onClick={onConvert}
            disabled={isConverting || isCreateMode || !detail}
          >
            <ArrowRightLeft className='size-4' />
            {isConverting ? '正在转正式销售订单…' : '转正式销售订单'}
          </Button>
          <Button
            className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
            onClick={onSave}
            disabled={isSaving || saveDisabled || (!detail && !isCreateMode)}
          >
            {isSaving
              ? isCreateMode
                ? '正在创建…'
                : '正在保存…'
              : isCreateMode
                ? '创建并继续处理'
                : '保存并继续处理'}
          </Button>
        </div>
      </div>
    </div>
  )
}
