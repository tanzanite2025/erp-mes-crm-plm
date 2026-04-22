import type { Dispatch, SetStateAction } from 'react'
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
import { useLanguage } from '@/context/language-provider'
import { getProviderCategory } from '@/features/logistics-config/provider-directory'
import type { LogisticsProviderDraft } from '@/features/sandbox/logistics-api/types'

type LogisticsSupplierDirectoryFieldsSectionProps = {
  formData: LogisticsProviderDraft
  setFormData: Dispatch<SetStateAction<LogisticsProviderDraft>>
}

export function LogisticsSupplierDirectoryFieldsSection({
  formData,
  setFormData,
}: LogisticsSupplierDirectoryFieldsSectionProps) {
  const { t } = useLanguage()

  return (
    <div className='space-y-4 rounded-3xl border border-dashed border-slate-200 p-5'>
      <div className='space-y-1'>
        <h4 className='text-[11px] font-black uppercase tracking-widest text-slate-500'>
          {t('logisticsConfig.providerShared.sectionDirectory.title')}
        </h4>
        <p className='text-xs text-muted-foreground'>
          {t('logisticsConfig.providerShared.sectionDirectory.description')}
        </p>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label className='pl-1 text-[10px] font-black uppercase tracking-widest opacity-50'>
            {t('logisticsConfig.suppliers.fields.category')}
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
            <SelectTrigger className='h-12 rounded-2xl border-slate-200 bg-white'>
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
        <div className='space-y-2'>
          <Label className='pl-1 text-[10px] font-black uppercase tracking-widest opacity-50'>
            {t('logisticsConfig.suppliers.fields.website')}
          </Label>
          <Input
            value={formData.website}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                website: event.target.value,
              }))
            }
            placeholder={t('logisticsConfig.suppliers.fields.websitePlaceholder')}
            className='h-12 rounded-2xl border-slate-200'
          />
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label className='pl-1 text-[10px] font-black uppercase tracking-widest opacity-50'>
            {t('logisticsConfig.suppliers.fields.contact')}
          </Label>
          <Input
            value={formData.contact}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                contact: event.target.value,
              }))
            }
            placeholder={t('logisticsConfig.suppliers.fields.contactPlaceholder')}
            className='h-12 rounded-2xl border-slate-200'
          />
        </div>
        <div className='space-y-2'>
          <Label className='pl-1 text-[10px] font-black uppercase tracking-widest opacity-50'>
            {t('logisticsConfig.suppliers.fields.phone')}
          </Label>
          <Input
            value={formData.phone}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                phone: event.target.value,
              }))
            }
            placeholder={t('logisticsConfig.suppliers.fields.phonePlaceholder')}
            className='h-12 rounded-2xl border-slate-200'
          />
        </div>
      </div>

      <div className='space-y-2'>
        <Label className='pl-1 text-[10px] font-black uppercase tracking-widest opacity-50'>
          {t('logisticsConfig.suppliers.fields.note')}
        </Label>
        <Textarea
          value={formData.note}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              note: event.target.value,
            }))
          }
          placeholder={t('logisticsConfig.suppliers.fields.notePlaceholder')}
          className='min-h-28 rounded-2xl border-slate-200'
        />
      </div>
    </div>
  )
}
