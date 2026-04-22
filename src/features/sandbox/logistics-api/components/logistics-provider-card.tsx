import { Link } from '@tanstack/react-router'
import { AlertTriangle, Eye, EyeOff, Globe, Loader2, MoveUpRight, PencilLine, RefreshCw, X } from 'lucide-react'
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
  getProviderCapabilities,
  getProviderCategory,
  getProviderLifecycleBadgeClass,
  getProviderLifecycleLabelKey,
  getProviderReferenceBadgeClass,
  getProviderReferenceBadgeLabelKey,
  getProviderReferenceRiskLabelKey,
  getProviderReferenceTone,
  getProviderVerificationActionKey,
  getProviderVerificationActionTone,
  getProviderVerificationBadgeClass,
  getProviderVerificationLabelKey,
  getProviderVerificationSummaryKey,
  getProviderVerificationStatus,
  isProviderApiConnected,
} from '@/features/logistics-config/provider-directory'
import type { LogisticsProvider } from '@/features/sandbox/logistics-api/types'

type LogisticsProviderCardProps = {
  provider: LogisticsProvider
  locale: string
  showSecret: boolean
  verifyPending: boolean
  deletePending: boolean
  onToggleSecret: () => void
  onEdit: () => void
  onVerify: () => void
  onDelete: () => void
}

export function LogisticsProviderCard({
  provider,
  locale,
  showSecret,
  verifyPending,
  deletePending,
  onToggleSecret,
  onEdit,
  onVerify,
  onDelete,
}: LogisticsProviderCardProps) {
  const { t } = useLanguage()
  const hasCredentials = Boolean(provider.appKey?.trim()) && Boolean(provider.appSecret?.trim())
  const quotaRemaining = typeof provider.quotaTotal === 'number' && typeof provider.quotaUsed === 'number'
    ? provider.quotaTotal - provider.quotaUsed
    : null

  return (
    <Card className='group relative overflow-hidden rounded-[32px] border-none bg-white shadow-sm transition-all hover:shadow-md'>
      <div className={`absolute top-0 left-0 h-full w-1.5 ${hasCredentials ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-4'>
            <div className={`flex size-12 items-center justify-center rounded-2xl shadow-inner ${hasCredentials ? 'bg-slate-50' : 'bg-amber-50'}`}>
              {hasCredentials ? <Globe className='size-6 text-slate-400' /> : <AlertTriangle className='size-6 text-amber-500' />}
            </div>
            <div>
              <CardTitle className='text-lg font-black italic uppercase tracking-tighter'>
                {provider.name}
              </CardTitle>
              <CardDescription className='flex items-center gap-2'>
                <Badge variant='outline' className='h-4 border-slate-200 px-1.5 text-[8px] font-black uppercase italic tracking-tighter'>
                  {provider.code}
                </Badge>
                <span className={getProviderLifecycleBadgeClass(provider.status)}>
                  {t(getProviderLifecycleLabelKey(provider.status))}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${getProviderVerificationBadgeClass(getProviderVerificationStatus(provider))}`}>
                  {t(getProviderVerificationLabelKey(getProviderVerificationStatus(provider)))}
                </span>
                <span className={getProviderApiConnectionBadgeClass(isProviderApiConnected(provider))}>
                  {t(getProviderApiConnectionLabelKey(isProviderApiConnected(provider)))}
                </span>
                {(provider.referenceCount || 0) > 0 ? (
                  <span className={getProviderReferenceBadgeClass(true)}>
                    {t(getProviderReferenceBadgeLabelKey(), { count: provider.referenceCount || 0 })}
                  </span>
                ) : null}
                {!hasCredentials ? (
                  <span className='rounded-full bg-amber-100/50 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-600'>
                    {t('logisticsConfig.platforms.states.missingCredentials')}
                  </span>
                ) : null}
              </CardDescription>
            </div>
          </div>
          <Button variant='outline' size='sm' className='rounded-full text-[10px] font-black uppercase tracking-widest' onClick={onEdit}>
            <PencilLine className='size-3.5' />
            {t('logisticsConfig.platforms.actions.edit')}
          </Button>
        </div>
      </CardHeader>

      <CardContent className='space-y-4 pt-2'>
        <div className='space-y-3 rounded-3xl border border-dashed border-slate-200 p-4'>
          <div className='text-[10px] font-black uppercase tracking-widest text-slate-500'>{t('logisticsConfig.providerShared.sectionDirectory.title')}</div>
          <div className='grid grid-cols-2 gap-3 text-[11px] text-slate-600'>
            <div>
              <span className='font-black text-slate-500'>{t('logisticsConfig.suppliers.website')}：</span>
              <span>{provider.website?.trim() || t('logisticsConfig.providerShared.states.unset')}</span>
            </div>
            <div>
              <span className='font-black text-slate-500'>{t('logisticsConfig.platforms.fields.category')}：</span>
              <span>{getProviderCategory(provider) === 'domestic' ? t('logisticsConfig.suppliers.categoryDomestic') : t('logisticsConfig.suppliers.categoryInternational')}</span>
            </div>
            <div>
              <span className='font-black text-slate-500'>{t('logisticsConfig.suppliers.contact')}：</span>
              <span>{provider.contact?.trim() || t('logisticsConfig.providerShared.states.unset')}</span>
            </div>
            <div>
              <span className='font-black text-slate-500'>{t('logisticsConfig.suppliers.phone')}：</span>
              <span>{provider.phone?.trim() || t('logisticsConfig.providerShared.states.unset')}</span>
            </div>
          </div>
          <div className='rounded-2xl border border-dashed border-slate-100 bg-slate-50/60 p-4 text-[10px] leading-relaxed text-slate-500'>
            {provider.note?.trim() || t('logisticsConfig.platforms.states.noteEmpty')}
          </div>
        </div>

        <div className='space-y-3 rounded-3xl border border-dashed border-primary/20 bg-primary/5 p-4'>
          <div className='text-[10px] font-black uppercase tracking-widest text-primary/70'>{t('logisticsConfig.providerShared.sectionIntegration.title')}</div>
          <div className='grid grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-white/80 p-4'>
            <div className='space-y-1'>
              <span className='text-[8px] font-black uppercase tracking-widest text-slate-400'>
                {t('logisticsConfig.platforms.fields.appKey')}
              </span>
              {provider.appKey?.trim() ? (
                <div className='flex items-center gap-2'>
                  <span className='max-w-[150px] truncate text-[10px] font-mono font-bold text-slate-600'>
                    {showSecret ? provider.appKey : '****************'}
                  </span>
                  <button type='button' onClick={onToggleSecret} className='text-slate-300 transition-colors hover:text-blue-600'>
                    {showSecret ? <EyeOff className='size-3' /> : <Eye className='size-3' />}
                  </button>
                </div>
              ) : (
                <span className='text-[10px] font-bold text-rose-500'>{t('logisticsConfig.providerShared.states.notConfigured')}</span>
              )}
            </div>

            <div className='space-y-1'>
              <span className='text-[8px] font-black uppercase tracking-widest text-slate-400'>
                {t('logisticsConfig.providerShared.labels.endpoint')}
              </span>
              <span className='block truncate text-[9px] font-mono font-bold text-slate-500'>
                {provider.endpoint || t('logisticsConfig.providerShared.states.notConfigured')}
              </span>
            </div>
          </div>

          <div className='grid grid-cols-3 gap-3 rounded-2xl border border-dashed border-slate-100 bg-white p-4'>
            <div className='space-y-1'>
              <span className='text-[8px] font-black uppercase tracking-widest text-slate-400'>{t('logisticsConfig.providerShared.labels.verifiedAt')}</span>
              <p className='text-[10px] font-bold text-slate-700'>{formatProviderVerifiedAt(provider.lastVerifiedAt, locale) || t('logisticsConfig.providerShared.states.notVerified')}</p>
            </div>
            <div className='space-y-1'>
              <span className='text-[8px] font-black uppercase tracking-widest text-slate-400'>{t('logisticsConfig.providerShared.labels.verificationSummary')}</span>
              <p className='text-[10px] font-bold text-slate-700'>
                {t(getProviderVerificationSummaryKey(provider))}
              </p>
            </div>
            <div className='space-y-1'>
              <span className='text-[8px] font-black uppercase tracking-widest text-slate-400'>{t('logisticsConfig.providerShared.labels.capabilities')}</span>
              <div className='flex flex-wrap gap-1'>
                {getProviderCapabilities(provider).length > 0 ? (
                  getProviderCapabilities(provider).map((capability) => (
                    <Badge key={capability} variant='outline' className='px-1.5 py-0 text-[8px]'>
                      {t(getLogisticsCapabilityLabelKey(capability))}
                    </Badge>
                  ))
                ) : (
                  <span className='text-[10px] font-bold text-slate-400'>{t('logisticsConfig.providerShared.states.notConfigured')}</span>
                )}
              </div>
            </div>
          </div>

          <div className={getProviderCalloutClass(getProviderVerificationActionTone(provider))}>
            {t(getProviderVerificationActionKey(provider))}
          </div>

          <div className={getProviderCalloutClass(getProviderReferenceTone(provider))}>
            {t(getProviderReferenceRiskLabelKey(provider), { count: provider.referenceCount || 0 })}
          </div>
        </div>

        <div className='grid grid-cols-3 gap-3 rounded-2xl border border-dashed border-slate-100 bg-white p-4'>
          <div className='space-y-1'>
            <span className='text-[8px] font-black uppercase tracking-widest text-slate-400'>
              {t('logisticsConfig.platforms.fields.quotaTotal')}
            </span>
            <p className='text-sm font-black italic tracking-tighter text-slate-700'>
              {provider.quotaTotal ?? 0}
            </p>
          </div>
          <div className='space-y-1'>
            <span className='text-[8px] font-black uppercase tracking-widest text-slate-400'>
              {t('logisticsConfig.platforms.fields.quotaUsed')}
            </span>
            <p className='text-sm font-black italic tracking-tighter text-slate-700'>
              {provider.quotaUsed ?? 0}
            </p>
          </div>
          <div className='space-y-1'>
            <span className='text-[8px] font-black uppercase tracking-widest text-slate-400'>
              {t('logisticsConfig.platforms.fields.quotaRemaining')}
            </span>
            <p className='text-sm font-black italic tracking-tighter text-slate-700'>
              {quotaRemaining ?? '-'}
            </p>
          </div>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' className='rounded-full text-[10px] font-black uppercase tracking-widest' onClick={onVerify} disabled={!provider.id || verifyPending}>
            {verifyPending ? <Loader2 className='size-3.5 animate-spin' /> : <RefreshCw className='size-3.5' />}
            {t('logisticsConfig.platforms.actions.verify')}
          </Button>
          <Button asChild variant='outline' className='rounded-full text-[10px] font-black uppercase tracking-widest'>
            <Link to='/logistics-config/suppliers'>
              <MoveUpRight className='size-3.5' />
              {t('logisticsConfig.platforms.actions.viewDirectory')}
            </Link>
          </Button>
          <Button
            variant='ghost'
            disabled={deletePending || (provider.referenceCount || 0) > 0}
            className='rounded-full text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 hover:text-rose-600'
            onClick={onDelete}
          >
            <X className='size-3.5' />
            {t('logisticsConfig.platforms.actions.delete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
