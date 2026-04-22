import type { Dispatch, SetStateAction } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/context/language-provider'
import type { LogisticsProviderDraft } from '@/features/sandbox/logistics-api/types'

type LogisticsSupplierBasicFieldsSectionProps = {
  formData: LogisticsProviderDraft
  setFormData: Dispatch<SetStateAction<LogisticsProviderDraft>>
}

export function LogisticsSupplierBasicFieldsSection({
  formData,
  setFormData,
}: LogisticsSupplierBasicFieldsSectionProps) {
  const { t } = useLanguage()

  return (
    <div className='grid grid-cols-2 gap-4'>
      <div className='space-y-2'>
        <Label className='pl-1 text-[10px] font-black uppercase tracking-widest opacity-50'>
          {t('logisticsConfig.suppliers.fields.name')}
        </Label>
        <Input
          value={formData.name}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              name: event.target.value,
            }))
          }
          className='h-12 rounded-2xl border-slate-200 focus-visible:ring-primary/20'
        />
      </div>
      <div className='space-y-2'>
        <Label className='pl-1 text-[10px] font-black uppercase tracking-widest opacity-50'>
          {t('logisticsConfig.suppliers.fields.code')}
        </Label>
        <Input
          value={formData.code}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              code: event.target.value.toUpperCase(),
            }))
          }
          className='h-12 rounded-2xl border-slate-200 font-black italic tracking-tighter'
        />
      </div>
    </div>
  )
}
