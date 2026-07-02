import type { Dispatch, SetStateAction } from 'react'
import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getLogisticsProviderVisibleCredentialFields } from '@/features/logistics-config/provider-directory/data/logistics-provider-rules'
import type { LogisticsProviderDraft } from '@/features/logistics-config/provider-directory/types'

type ProviderCredentialsSectionProps = {
  formData: LogisticsProviderDraft
  setFormData: Dispatch<SetStateAction<LogisticsProviderDraft>>
}

function getCredentialFieldLabelKey(
  fieldKey: keyof Pick<
    LogisticsProviderDraft,
    'appKey' | 'appSecret' | 'customerId' | 'checkWord'
  >
) {
  switch (fieldKey) {
    case 'appKey':
      return 'logisticsConfig.platforms.fields.appKey'
    case 'appSecret':
      return 'logisticsConfig.platforms.fields.appSecret'
    case 'customerId':
      return 'logisticsConfig.platforms.fields.customerId'
    default:
      return 'logisticsConfig.platforms.fields.checkWord'
  }
}

export function ProviderCredentialsSection({
  formData,
  setFormData,
}: ProviderCredentialsSectionProps) {
  const { t } = useLanguage()
  const credentialFields = getLogisticsProviderVisibleCredentialFields(formData)

  return (
    <div className='space-y-2 border-t border-dashed border-slate-200 pt-3'>
      <h4 className='flex items-center gap-1 pl-1 text-[10px] font-black tracking-widest text-slate-400 uppercase'>
        {t('logisticsConfig.platforms.sections.credentialsTitle')}
        <span className='text-[8px] font-bold tracking-normal text-rose-500 normal-case'>
          * {t('logisticsConfig.platforms.sections.credentialsHint')}
        </span>
      </h4>
      <div className='grid grid-cols-2 gap-3'>
        {credentialFields.map((fieldKey) => {
          return (
            <div key={fieldKey} className='space-y-1.5'>
              <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
                {t(getCredentialFieldLabelKey(fieldKey))}
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
                className='h-11 rounded-2xl border-slate-200 bg-slate-50'
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
