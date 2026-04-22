import { Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/context/language-provider'
import { LOGISTICS_TEMPLATES } from '@/features/sandbox/logistics-api/types'

type LogisticsSupplierTemplateSectionProps = {
  selectedTemplateNote: string
  onApplyTemplate: (code: string) => void
}

export function LogisticsSupplierTemplateSection({
  selectedTemplateNote,
  onApplyTemplate,
}: LogisticsSupplierTemplateSectionProps) {
  const { t } = useLanguage()

  return (
    <div className='space-y-2 border-b border-dashed border-slate-200 pb-4'>
      <Label className='pl-1 text-[10px] font-black uppercase tracking-widest text-primary'>
        {t('logisticsConfig.suppliers.fields.template')}
      </Label>
      <Select onValueChange={onApplyTemplate}>
        <SelectTrigger className='h-12 rounded-2xl border-primary/10 bg-primary/5 font-bold text-primary'>
          <SelectValue placeholder={t('logisticsConfig.suppliers.fields.templatePlaceholder')} />
        </SelectTrigger>
        <SelectContent className='rounded-2xl border-none shadow-2xl'>
          {LOGISTICS_TEMPLATES.map((template) => (
            <SelectItem key={template.code} value={template.code} className='rounded-xl py-3'>
              <span className='font-black italic'>{template.code}</span>
              {' - '}
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedTemplateNote ? (
        <p className='flex items-center gap-1 pl-1 text-[11px] text-primary/70'>
          <Info className='size-3' />
          {selectedTemplateNote}
        </p>
      ) : null}
    </div>
  )
}
