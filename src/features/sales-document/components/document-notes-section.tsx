import { Tag } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface DocumentNotesSectionProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  compact?: boolean
}

export function DocumentNotesSection({
  value,
  onChange,
  readOnly = false,
  compact = false,
}: DocumentNotesSectionProps) {
  const { t } = useLanguage()

  return (
    <section className={cn('grid gap-2', compact && 'gap-1.5')}>
      <Label className='flex items-center gap-2 pl-1 text-[10px] font-black text-secondary uppercase'>
        <Tag className='size-3' />
        {t('tradingSalesOrder.dialog.memoLabel')}
      </Label>
      <Textarea
        placeholder={t('tradingSalesOrder.dialog.memoPlaceholder')}
        rows={2}
        className={cn(
          'resize-none rounded-2xl border-muted/60 px-3 py-2 text-xs leading-5 font-medium transition-shadow focus:shadow-xl',
          compact && 'rounded-[18px] py-1.5'
        )}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />
    </section>
  )
}
