import { Info } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LOGISTICS_TEMPLATES } from '@/features/sandbox/logistics-api/types'

type ProviderTemplateSectionProps = {
  selectedNote: string
  onApplyTemplate: (code: string) => void
}

export function ProviderTemplateSection({
  selectedNote,
  onApplyTemplate,
}: ProviderTemplateSectionProps) {
  const { t } = useLanguage()

  return (
    <div className='space-y-1.5 border-b border-dashed border-slate-200 pb-3'>
      <Label className='pl-1 text-[10px] font-black tracking-widest text-blue-600 uppercase'>
        {t('logisticsConfig.platforms.sections.templateTitle')}
      </Label>
      <Select onValueChange={onApplyTemplate}>
        <SelectTrigger className='h-11 rounded-2xl border-blue-500/10 bg-blue-500/5 font-bold text-blue-800'>
          <SelectValue
            placeholder={t(
              'logisticsConfig.platforms.fields.templatePlaceholder'
            )}
          />
        </SelectTrigger>
        <SelectContent className='rounded-2xl border-none shadow-2xl'>
          {LOGISTICS_TEMPLATES.map((template) => (
            <SelectItem
              key={template.code}
              value={template.code}
              className='rounded-xl py-3'
            >
              <span className='font-black italic'>{template.code}</span>
              {' - '}
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedNote ? (
        <p className='flex items-center gap-1 pl-1 text-[9px] font-bold text-blue-500'>
          <Info className='size-3' />
          {selectedNote}
        </p>
      ) : null}
    </div>
  )
}
