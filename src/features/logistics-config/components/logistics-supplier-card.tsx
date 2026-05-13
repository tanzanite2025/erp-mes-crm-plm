import { Link } from '@tanstack/react-router'
import { Globe, MoveUpRight, PencilLine, Phone, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import {
  formatProviderVerifiedAt,
  getLogisticsCapabilityLabelKey,
  getProviderApiConnectionBadgeClass,
  getProviderApiConnectionLabelKey,
  getProviderCalloutClass,
  getProviderCredentialsBadgeClass,
  getProviderCredentialsLabelKey,
  getProviderCapabilities,
  getProviderCategory,
  getProviderReferenceBadgeClass,
  getProviderReferenceBadgeLabelKey,
  getProviderReferenceRiskLabelKey,
  getProviderReferenceTone,
  getProviderVerificationActionKey,
  getProviderVerificationActionTone,
  getProviderVerificationBadgeClass,
  getProviderVerificationLabelKey,
  getProviderVerificationStatus,
  getProviderVerificationSummaryKey,
  isProviderApiConnected,
  findLogisticsTemplateByCode,
  hasProviderCredentials,
} from '@/features/logistics-config/provider-directory'
import type { LogisticsProvider } from '@/features/sandbox/logistics-api/types'

type LogisticsSupplierCardProps = {
  provider: LogisticsProvider
  locale: string
  onEdit: () => void
}

export function LogisticsSupplierCard({
  provider,
  locale,
  onEdit,
}: LogisticsSupplierCardProps) {
  const { t } = useLanguage()
  const apiConnected = isProviderApiConnected(provider)
  const credentialsConfigured = hasProviderCredentials(provider)
  const templateMatched = Boolean(findLogisticsTemplateByCode(provider.code))
  const verificationStatus = getProviderVerificationStatus(provider)
  const capabilities = getProviderCapabilities(provider)

  return (
    <Card className='rounded-[28px] border-dashed bg-background/80 shadow-none'>
      <CardHeader className='space-y-3'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <CardTitle className='text-base font-black tracking-tight'>{provider.name}</CardTitle>
            <CardDescription className='mt-1 text-[10px] font-black uppercase tracking-widest'>
              {provider.code}
            </CardDescription>
          </div>
          <div className='flex flex-col items-end gap-2'>
            <Badge className='border-none bg-primary/10 text-primary'>
              {getProviderCategory(provider) === 'domestic'
                ? t('logisticsConfig.suppliers.categoryDomestic')
                : t('logisticsConfig.suppliers.categoryInternational')}
            </Badge>
            <Badge className={getProviderVerificationBadgeClass(verificationStatus)}>
              {t(getProviderVerificationLabelKey(verificationStatus))}
            </Badge>
          </div>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Badge variant='outline' className='text-[10px]'>
            {templateMatched
              ? t('logisticsConfig.suppliers.templateLinked')
              : t('logisticsConfig.suppliers.customEntry')}
          </Badge>
          <Badge className={getProviderApiConnectionBadgeClass(apiConnected)}>
            {t(getProviderApiConnectionLabelKey(apiConnected))}
          </Badge>
          <Badge className={getProviderCredentialsBadgeClass(credentialsConfigured)}>
            {t(getProviderCredentialsLabelKey(credentialsConfigured))}
          </Badge>
          {(provider.referenceCount || 0) > 0 ? (
            <Badge className={getProviderReferenceBadgeClass(true)}>
              {t(getProviderReferenceBadgeLabelKey(), { count: provider.referenceCount || 0 })}
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className='space-y-4 text-sm'>
        <div className='space-y-3 rounded-3xl border border-dashed border-slate-200 p-4'>
          <div className='text-[10px] font-black uppercase tracking-widest text-slate-500'>{t('logisticsConfig.providerShared.sectionDirectory.title')}</div>
          <div className='flex items-start gap-3'>
            <Globe className='mt-0.5 size-4 text-primary' />
            <div className='min-w-0 space-y-1'>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                {t('logisticsConfig.suppliers.website')}
              </div>
              {provider.website.trim() ? (
                <a className='break-all font-mono text-xs text-blue-600 hover:underline' href={provider.website} target='_blank' rel='noreferrer'>
                  {provider.website}
                </a>
              ) : (
                <div className='font-bold text-muted-foreground'>{t('logisticsConfig.suppliers.unset')}</div>
              )}
            </div>
          </div>

          <div className='flex items-start gap-3'>
            <UserRound className='mt-0.5 size-4 text-primary' />
            <div className='space-y-1'>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                {t('logisticsConfig.suppliers.contact')}
              </div>
              <div className='font-bold'>{provider.contact.trim() || t('logisticsConfig.suppliers.unset')}</div>
            </div>
          </div>

          <div className='flex items-start gap-3'>
            <Phone className='mt-0.5 size-4 text-primary' />
            <div className='space-y-1'>
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                {t('logisticsConfig.suppliers.phone')}
              </div>
              <div className='font-bold'>{provider.phone.trim() || t('logisticsConfig.suppliers.unset')}</div>
            </div>
          </div>

          <div className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-[11px] leading-relaxed text-primary/80'>
            {provider.note.trim() || t('logisticsConfig.suppliers.noteEmpty')}
          </div>
        </div>

        <div className='space-y-3 rounded-3xl border border-dashed border-primary/20 bg-primary/5 p-4'>
          <div className='text-[10px] font-black uppercase tracking-widest text-primary/70'>{t('logisticsConfig.providerShared.sectionIntegration.title')}</div>
          <div className='space-y-2 text-[11px] text-slate-600'>
            <div>
              <span className='font-black text-slate-500'>{t('logisticsConfig.providerShared.labels.endpoint')}：</span>
              <span className='font-mono'>{provider.endpoint.trim() || t('logisticsConfig.suppliers.unset')}</span>
            </div>
            <div>
              <span className='font-black text-slate-500'>{t('logisticsConfig.providerShared.labels.verifiedAt')}：</span>
              <span>{formatProviderVerifiedAt(provider.lastVerifiedAt, locale) || t('logisticsConfig.providerShared.states.notVerified')}</span>
            </div>
            <div>
              <span className='font-black text-slate-500'>{t('logisticsConfig.providerShared.labels.verificationSummary')}：</span>
              <span>{t(getProviderVerificationSummaryKey(provider))}</span>
            </div>
            <div>
              <span className='font-black text-slate-500'>{t('logisticsConfig.providerShared.labels.nextAction')}：</span>
              <span>{t(getProviderVerificationActionKey(provider))}</span>
            </div>
          </div>

          <div className='space-y-2'>
            <div className='text-[10px] font-black uppercase tracking-widest text-slate-500'>{t('logisticsConfig.providerShared.labels.capabilities')}</div>
            <div className='flex flex-wrap gap-2'>
              {capabilities.length > 0 ? (
                capabilities.map((capability) => (
                  <Badge key={capability} variant='outline' className='text-[10px]'>
                    {t(getLogisticsCapabilityLabelKey(capability))}
                  </Badge>
                ))
              ) : (
                <span className='text-xs text-muted-foreground'>{t('logisticsConfig.providerShared.states.notConfigured')}</span>
              )}
            </div>
          </div>

          <div className={getProviderCalloutClass(getProviderVerificationActionTone(provider))}>
            {t(getProviderVerificationActionKey(provider))}
          </div>

          <div className={getProviderCalloutClass(getProviderReferenceTone(provider))}>
            {t(getProviderReferenceRiskLabelKey(provider), { count: provider.referenceCount || 0 })}
          </div>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' className='rounded-full text-[10px] font-black uppercase tracking-widest' onClick={onEdit}>
            <PencilLine className='size-3.5' />
            {t('logisticsConfig.suppliers.actions.edit')}
          </Button>
          <Button asChild className='rounded-full text-[10px] font-black uppercase tracking-widest'>
            <Link to='/logistics-config/platforms'>
              <MoveUpRight className='size-3.5' />
              {t('logisticsConfig.suppliers.actions.goToPlatforms')}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
