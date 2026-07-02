import type { Dispatch, SetStateAction } from 'react'
import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getProviderCategory } from '@/features/logistics-config/provider-directory'
import type { LogisticsProviderDraft } from '@/features/logistics-config/provider-directory/types'

type ProviderDirectoryFieldsSectionProps = {
  formData: LogisticsProviderDraft
  setFormData: Dispatch<SetStateAction<LogisticsProviderDraft>>
}

export function ProviderDirectoryFieldsSection({
  formData,
  setFormData,
}: ProviderDirectoryFieldsSectionProps) {
  const { t } = useLanguage()

  return (
    <div className='space-y-3 rounded-3xl border border-dashed border-slate-200 p-4'>
      <div className='space-y-1'>
        <h4 className='text-[11px] font-black tracking-widest text-slate-500 uppercase'>
          {t('logisticsConfig.platforms.sections.directoryTitle')}
        </h4>
        <p className='text-xs text-muted-foreground'>
          {t('logisticsConfig.platforms.sections.directoryDescription')}
        </p>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
            {t('logisticsConfig.platforms.fields.category')}
          </Label>
          <Select
            value={getProviderCategory(formData)}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                category: value as LogisticsProviderDraft['category'],
              }))
            }
          >
            <SelectTrigger className='h-11 rounded-2xl border-slate-200'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='rounded-2xl border-none shadow-2xl'>
              <SelectItem value='domestic' className='rounded-xl py-3'>
                {t('logisticsConfig.suppliers.categoryDomestic')}
              </SelectItem>
              <SelectItem value='international' className='rounded-xl py-3'>
                {t('logisticsConfig.suppliers.categoryInternational')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
            {t('logisticsConfig.platforms.fields.website')}
          </Label>
          <Input
            value={formData.website || ''}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                website: event.target.value,
              }))
            }
            className='h-11 rounded-2xl border-slate-200'
            placeholder='https://...'
          />
        </div>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
            {t('logisticsConfig.platforms.fields.contact')}
          </Label>
          <Input
            value={formData.contact || ''}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                contact: event.target.value,
              }))
            }
            className='h-11 rounded-2xl border-slate-200'
          />
        </div>
        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
            {t('logisticsConfig.platforms.fields.phone')}
          </Label>
          <Input
            value={formData.phone || ''}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                phone: event.target.value,
              }))
            }
            className='h-11 rounded-2xl border-slate-200'
          />
        </div>
      </div>

      <div className='space-y-1.5'>
        <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
          {t('logisticsConfig.platforms.fields.note')}
        </Label>
        <Textarea
          value={formData.note || ''}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              note: event.target.value,
            }))
          }
          className='min-h-20 rounded-2xl border-slate-200'
          placeholder={t('logisticsConfig.platforms.fields.notePlaceholder')}
        />
      </div>
    </div>
  )
}
