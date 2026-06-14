import type { Dispatch, SetStateAction } from 'react'
import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getLogisticsProviderVisibleCredentialFields } from '@/features/sandbox/logistics-api/data/logistics-provider-rules'
import type { LogisticsProviderDraft } from '@/features/sandbox/logistics-api/types'

type SupplierCredentialFieldKey = keyof Pick<
  LogisticsProviderDraft,
  'appKey' | 'appSecret' | 'customerId' | 'checkWord'
>

type LogisticsSupplierCredentialsSectionProps = {
  formData: LogisticsProviderDraft
  setFormData: Dispatch<SetStateAction<LogisticsProviderDraft>>
}

function getCredentialFieldLabelKey(fieldKey: SupplierCredentialFieldKey) {
  switch (fieldKey) {
    case 'appKey':
      return 'logisticsConfig.suppliers.fields.appKey'
    case 'appSecret':
      return 'logisticsConfig.suppliers.fields.appSecret'
    case 'customerId':
      return 'logisticsConfig.suppliers.fields.customerId'
    default:
      return 'logisticsConfig.suppliers.fields.checkWord'
  }
}

export function LogisticsSupplierCredentialsSection({
  formData,
  setFormData,
}: LogisticsSupplierCredentialsSectionProps) {
  const { t } = useLanguage()
  const credentialFields = getLogisticsProviderVisibleCredentialFields(formData)

  return (
    <div className='space-y-3 rounded-3xl border border-dashed border-primary/20 bg-primary/5 p-5'>
      <h4 className='flex items-center gap-2 pl-1 text-[10px] font-black tracking-widest text-primary/70 uppercase'>
        {t('logisticsConfig.suppliers.sections.credentialsTitle')}
        <span className='text-[8px] font-bold tracking-normal text-amber-600 normal-case'>
          * {t('logisticsConfig.suppliers.sections.credentialsHint')}
        </span>
      </h4>
      <div className='grid grid-cols-2 gap-4'>
        {credentialFields.map((fieldKey) => (
          <div key={fieldKey} className='space-y-2'>
            <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
              {t(
                getCredentialFieldLabelKey(
                  fieldKey as SupplierCredentialFieldKey
                )
              )}
            </Label>
            <Input
              type={fieldKey === 'appSecret' ? 'password' : 'text'}
              value={formData[fieldKey]}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  [fieldKey]: event.target.value,
                }))
              }
              className='h-12 rounded-2xl border-slate-200 bg-white/80'
            />
          </div>
        ))}
      </div>
    </div>
  )
}
