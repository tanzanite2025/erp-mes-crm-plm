import { Tag } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/language-provider'

interface DocumentNotesSectionProps {
  value: string
  onChange: (value: string) => void
}

export function DocumentNotesSection({ value, onChange }: DocumentNotesSectionProps) {
  const { t } = useLanguage()

  return (
    <section className='grid gap-2'>
      <Label className='flex items-center gap-2 pl-1 text-[10px] font-black uppercase text-secondary'>
        <Tag className='size-3' />
        {t('tradingSalesOrder.dialog.memoLabel')}
      </Label>
      <Textarea
        placeholder={t('tradingSalesOrder.dialog.memoPlaceholder')}
        rows={3}
        className='resize-none rounded-[24px] border-muted/60 p-3 text-xs font-medium leading-relaxed transition-shadow focus:shadow-xl'
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </section>
  )
}
