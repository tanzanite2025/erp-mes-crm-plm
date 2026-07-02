import type { Dispatch, SetStateAction } from 'react'
import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { LogisticsProviderDraft } from '@/features/logistics-config/provider-directory/types'

type ProviderBasicFieldsSectionProps = {
  formData: LogisticsProviderDraft
  setFormData: Dispatch<SetStateAction<LogisticsProviderDraft>>
}

export function ProviderBasicFieldsSection({
  formData,
  setFormData,
}: ProviderBasicFieldsSectionProps) {
  const { t } = useLanguage()

  return (
    <div className='grid grid-cols-2 gap-3'>
      <div className='space-y-1.5'>
        <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
          {t('logisticsConfig.platforms.fields.name')}
        </Label>
        <Input
          value={formData.name}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              name: event.target.value,
            }))
          }
          className='h-11 rounded-2xl border-slate-200 focus-visible:ring-blue-500/30'
        />
      </div>
      <div className='space-y-1.5'>
        <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
          {t('logisticsConfig.platforms.fields.code')}
        </Label>
        <Input
          value={formData.code}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              code: event.target.value.toUpperCase(),
            }))
          }
          className='h-11 rounded-2xl border-slate-200 font-black tracking-tighter italic'
        />
      </div>
    </div>
  )
}
