import { Button } from '@/components/ui/button'
import type { QuoteDetail } from '@/features/quotes/data/quote-detail'

type QuoteWorkspaceFooterProps = {
  detail: QuoteDetail | null
  isCreateMode: boolean
  isSaving: boolean
  saveDisabled?: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
}

export function QuoteWorkspaceFooter({
  detail,
  isCreateMode,
  isSaving,
  saveDisabled = false,
  onOpenChange,
  onSave,
}: QuoteWorkspaceFooterProps) {
  return (
    <div className='border-t border-dashed border-border/60 px-6 py-4'>
      <div className='flex items-center justify-end gap-2'>
        <Button variant='outline' onClick={() => onOpenChange(false)}>
          关闭
        </Button>
        <Button onClick={onSave} disabled={isSaving || saveDisabled || (!detail && !isCreateMode)}>
          {isSaving ? (isCreateMode ? '正在创建…' : '正在保存…') : isCreateMode ? '创建并继续处理' : '保存并继续处理'}
        </Button>
      </div>
    </div>
  )
}
