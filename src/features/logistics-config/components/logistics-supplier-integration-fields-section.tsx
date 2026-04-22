import type { Dispatch, SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/context/language-provider'
import {
  getLogisticsCapabilityLabelKey,
  getProviderApiConnectionLabelKey,
  getProviderCalloutClass,
  getProviderCapabilities,
  getProviderReferenceRiskLabelKey,
  getProviderReferenceTone,
  getProviderVerificationActionKey,
  getProviderVerificationActionTone,
  getProviderVerificationLabelKey,
  LOGISTICS_CAPABILITY_OPTIONS,
  toggleProviderCapability,
} from '@/features/logistics-config/provider-directory'
import type { LogisticsProviderDraft, LogisticsVerificationStatus } from '@/features/sandbox/logistics-api/types'

type LogisticsSupplierIntegrationFieldsSectionProps = {
  formData: LogisticsProviderDraft
  setFormData: Dispatch<SetStateAction<LogisticsProviderDraft>>
  previewConnected: boolean
  previewVerificationStatus: LogisticsVerificationStatus
}

export function LogisticsSupplierIntegrationFieldsSection({
  formData,
  setFormData,
  previewConnected,
  previewVerificationStatus,
}: LogisticsSupplierIntegrationFieldsSectionProps) {
  const { t } = useLanguage()

  return (
    <div className='space-y-4 rounded-3xl border border-dashed border-primary/20 bg-primary/5 p-5'>
      <div className='space-y-1'>
        <h4 className='text-[11px] font-black uppercase tracking-widest text-primary/80'>
          {t('logisticsConfig.providerShared.sectionIntegration.title')}
        </h4>
        <p className='text-xs text-primary/70'>
          {t('logisticsConfig.providerShared.sectionIntegration.description')}
        </p>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label className='pl-1 text-[10px] font-black uppercase tracking-widest opacity-50'>
            {t('logisticsConfig.suppliers.fields.endpoint')}
          </Label>
          <Input
            value={formData.endpoint}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                endpoint: event.target.value,
              }))
            }
            placeholder={t('logisticsConfig.suppliers.fields.endpointPlaceholder')}
            className='h-12 rounded-2xl border-slate-200 font-mono text-[11px]'
          />
        </div>
        <div className='space-y-2'>
          <Label className='pl-1 text-[10px] font-black uppercase tracking-widest opacity-50'>
            {t('logisticsConfig.suppliers.fields.apiStatus')}
          </Label>
          <div className='flex h-12 items-center rounded-2xl border border-dashed bg-white/70 px-3 text-[11px] font-bold text-slate-600'>
            {`${t(getProviderApiConnectionLabelKey(previewConnected))} / ${t(getProviderVerificationLabelKey(previewVerificationStatus))}`}
          </div>
        </div>
      </div>

      <div className='space-y-2'>
        <Label className='pl-1 text-[10px] font-black uppercase tracking-widest opacity-50'>
          {t('logisticsConfig.providerShared.labels.capabilities')}
        </Label>
        <div className='flex flex-wrap gap-2'>
          {LOGISTICS_CAPABILITY_OPTIONS.map((capability) => {
            const selected = getProviderCapabilities(formData).includes(capability.value)
            return (
              <Button
                key={capability.value}
                type='button'
                variant={selected ? 'default' : 'outline'}
                className='rounded-full text-[10px] font-black uppercase tracking-widest'
                onClick={() => setFormData((prev) => toggleProviderCapability(prev, capability.value))}
              >
                {t(getLogisticsCapabilityLabelKey(capability.value))}
              </Button>
            )
          })}
        </div>
      </div>

      <div className={getProviderCalloutClass(getProviderVerificationActionTone(formData))}>
        {t(getProviderVerificationActionKey(formData))}
      </div>

      {formData.id ? (
        <div className={getProviderCalloutClass(getProviderReferenceTone(formData))}>
          {t(getProviderReferenceRiskLabelKey(formData), { count: formData.referenceCount || 0 })}
        </div>
      ) : null}
    </div>
  )
}
