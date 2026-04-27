import { ArrowRightLeft, FileDown, MessageCircleMore, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

type QuoteWorkspaceActionPanelProps = {
  isCreateMode: boolean
  hasDetail: boolean
  isSaving: boolean
  saveDisabled?: boolean
  isConverting: boolean
  transferLabel: string
  transferHelper: string
  onSave: () => void
  onExportPdf: () => void
  onTransfer: () => void
  onConvert: () => void
}

export function QuoteWorkspaceActionPanel({
  isCreateMode,
  hasDetail,
  isSaving,
  saveDisabled = false,
  isConverting,
  transferLabel,
  transferHelper,
  onSave,
  onExportPdf,
  onTransfer,
  onConvert,
}: QuoteWorkspaceActionPanelProps) {
  return (
    <div className={`bg-muted/10 px-6 py-5 ${isCreateMode ? 'border-t border-dashed border-border/60 xl:border-l xl:border-t-0' : 'border-t border-dashed border-border/60 lg:border-t-0 lg:border-l'}`}>
      <div className='space-y-4'>
        <Button className='w-full justify-start rounded-full' size='lg' onClick={onSave} disabled={isSaving || saveDisabled || (!hasDetail && !isCreateMode)}>
          <Save className='size-4' />
          {isSaving ? (isCreateMode ? '正在创建报价…' : '正在保存报价…') : isCreateMode ? '创建报价' : '保存当前报价'}
        </Button>
        <Button className='w-full justify-start rounded-full' size='lg' variant='outline' onClick={onExportPdf} disabled={isCreateMode || !hasDetail}>
          <FileDown className='size-4' />
          一键保存 PDF
        </Button>
        <Button className='w-full justify-start rounded-full' size='lg' variant='outline' onClick={onTransfer} disabled={isCreateMode || !hasDetail}>
          <MessageCircleMore className='size-4' />
          {transferLabel}
        </Button>
        <p className='px-1 text-xs text-muted-foreground'>{transferHelper}</p>
        <Button className='w-full justify-start rounded-full' size='lg' variant='outline' onClick={onConvert} disabled={isConverting || isCreateMode || !hasDetail}>
          <ArrowRightLeft className='size-4' />
          {isConverting ? '正在转正式销售订单…' : '转正式销售订单'}
        </Button>
      </div>
    </div>
  )
}
