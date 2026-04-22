import type { Dispatch, SetStateAction } from 'react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import type {
  LogisticsProviderDraft,
  LogisticsVerificationStatus,
} from '@/features/sandbox/logistics-api/types'

type ProviderIntegrationFieldsSectionProps = {
  formData: LogisticsProviderDraft
  setFormData: Dispatch<SetStateAction<LogisticsProviderDraft>>
  previewConnected: boolean
  previewVerificationStatus: LogisticsVerificationStatus | 'disabled'
}

export function ProviderIntegrationFieldsSection({
  formData,
  setFormData,
  previewConnected,
  previewVerificationStatus,
}: ProviderIntegrationFieldsSectionProps) {
  const { t } = useLanguage()

  return (
    <div className='space-y-3 rounded-3xl border border-dashed border-primary/20 bg-primary/5 p-4'>
      <div className='space-y-1'>
        <h4 className='text-[11px] font-black tracking-widest text-primary/70 uppercase'>
          {t('logisticsConfig.platforms.sections.integrationTitle')}
        </h4>
        <p className='text-xs text-primary/70'>
          {t('logisticsConfig.platforms.sections.integrationDescription')}
        </p>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
            {t('logisticsConfig.platforms.fields.endpoint')}
          </Label>
          <Input
            value={formData.endpoint}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                endpoint: event.target.value,
              }))
            }
            className='h-11 rounded-2xl border-slate-200 font-mono text-[11px]'
            placeholder='https://...'
          />
        </div>
        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
            {t('logisticsConfig.providerShared.labels.verificationStatus')}
          </Label>
          <div className='flex h-11 items-center rounded-2xl border border-dashed bg-white/70 px-3 text-[11px] font-bold text-slate-600'>
            {`${t(getProviderApiConnectionLabelKey(previewConnected))} / ${t(getProviderVerificationLabelKey(previewVerificationStatus))}`}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
            {t('logisticsConfig.platforms.fields.quotaAlertAt')}
          </Label>
          <Input
            type='number'
            min='0'
            value={String(formData.quotaAlertAt)}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                quotaAlertAt: Number.isFinite(Number(event.target.value))
                  ? Number(event.target.value)
                  : 0,
              }))
            }
            className='h-11 rounded-2xl border-slate-200'
          />
        </div>
      </div>

      <div className='space-y-1.5'>
        <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
          {t('logisticsConfig.providerShared.labels.capabilities')}
        </Label>
        <div className='flex flex-wrap gap-1.5'>
          {LOGISTICS_CAPABILITY_OPTIONS.map((capability) => {
            const selected = getProviderCapabilities(formData).includes(
              capability.value
            )
            return (
              <Button
                key={capability.value}
                type='button'
                variant={selected ? 'default' : 'outline'}
                className='h-8 rounded-full px-3 text-[10px] font-black tracking-widest uppercase'
                onClick={() =>
                  setFormData((prev) =>
                    toggleProviderCapability(prev, capability.value)
                  )
                }
              >
                {t(getLogisticsCapabilityLabelKey(capability.value))}
              </Button>
            )
          })}
        </div>
      </div>

      <div
        className={`${getProviderCalloutClass(getProviderVerificationActionTone(formData))} px-3 py-2`}
      >
        {t(getProviderVerificationActionKey(formData))}
      </div>

      {formData.id ? (
        <div
          className={`${getProviderCalloutClass(getProviderReferenceTone(formData))} px-3 py-2`}
        >
          {t(getProviderReferenceRiskLabelKey(formData), {
            count: formData.referenceCount || 0,
          })}
        </div>
      ) : null}
    </div>
  )
}
