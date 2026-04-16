import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Logo } from '@/assets/logo'
import { useLanguage } from '@/context/language-provider'
import { EnterpriseService } from '@/features/basic-settings/services/enterprise-service'
import { getStaticEvidenceUrl } from '@/lib/url-utils'

interface PurchasePrintDocumentProps {
  title: string
  documentNoLabel: string
  documentNo?: string
  footerNote?: string
  children: ReactNode
}

interface PurchasePrintInfoItem {
  label: string
  value?: string
  span?: 1 | 2
}

interface PurchasePrintInfoGridProps {
  items: PurchasePrintInfoItem[]
}

interface PurchasePrintSectionProps {
  title: string
  description?: string
  pageBreakBefore?: boolean
  children: ReactNode
}

interface PurchasePrintPhotoCardProps {
  title: string
  photoLabel: string
  photoName: string
  photoUrl: string
  metaRows: Array<{ label: string; value?: string }>
}

export interface PurchasePrintSignatureEntry {
  label: string
  value?: string
}

interface PurchasePrintSignatureGridProps {
  entries: PurchasePrintSignatureEntry[]
}

export function formatPurchasePrintDateTime(value?: string) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatPurchasePrintNumber(value?: number) {
  return Number(value || 0).toLocaleString()
}

export function buildCurrentUserIdentityText(user?: {
  username?: string
  accountNo?: string
}, identitySuffix?: string) {
  if (!user) return undefined

  const normalizedIdentitySuffix = identitySuffix?.trim() || ''
  const primaryIdentity = [user.username, user.accountNo].filter(Boolean).join(' / ')

  if (primaryIdentity && normalizedIdentitySuffix) return `${primaryIdentity} (${normalizedIdentitySuffix})`
  return primaryIdentity || normalizedIdentitySuffix || undefined
}

export function PurchasePrintDocument({
  title,
  documentNoLabel,
  documentNo,
  footerNote = '本单据为系统生成的采购业务打印件，照片及数据以系统留档为准。',
  children,
}: PurchasePrintDocumentProps) {
  const { locale, t } = useLanguage()
  const localizedCompanyName = useMemo(() => {
    const line1 = t('printMgmt.bomTemplate.companyLine1')
    const line2 = t('printMgmt.bomTemplate.companyLine2')
    return locale === 'zh-CN' ? `${line1}${line2}`.trim() : `${line1} ${line2}`.trim()
  }, [locale, t])
  const [enterpriseName, setEnterpriseName] = useState('')
  const [enterprisePlan, setEnterprisePlan] = useState('')

  useEffect(() => {
    let disposed = false

    const loadEnterprise = async () => {
      const config = await EnterpriseService.getConfig().catch(() => null)
      if (disposed || !config) return
      setEnterpriseName((config.name || '').trim())
      setEnterprisePlan((config.plan || '').trim())
    }

    void loadEnterprise()

    const handleSync = () => {
      void loadEnterprise()
    }

    window.addEventListener('xdfc_enterprise_config_updated', handleSync)
    return () => {
      disposed = true
      window.removeEventListener('xdfc_enterprise_config_updated', handleSync)
    }
  }, [])

  const companyName = enterpriseName || localizedCompanyName
  const brandCaption = enterprisePlan || (locale === 'zh-CN' ? '采购业务打印单据' : 'Procurement Print Document')
  const editionText = locale === 'zh-CN' ? '采购打印标准版' : 'Procurement Standard Print'

  return (
    <div className='purchase-print-sheet mx-auto box-border w-full bg-white text-[12px] leading-6 text-black'>
      <style type='text/css'>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .purchase-print-page-break {
              break-before: page;
              page-break-before: always;
            }
            .purchase-print-avoid-break {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
          .purchase-print-sheet {
            width: 100%;
            min-height: calc(297mm - 16mm);
            padding: 6mm;
          }
          .purchase-print-photo-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 4mm;
          }
          .purchase-print-photo-card {
            min-height: 112mm;
          }
          .purchase-print-photo-image {
            height: 64mm;
          }
          .purchase-print-signature-grid {
            gap: 4mm;
          }
          .purchase-print-signature-cell {
            min-height: 24mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
        `}
      </style>

      <div className='border-b-2 border-black pb-4'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex items-start gap-3'>
            <div className='flex size-12 items-center justify-center rounded-full border border-black/20 bg-black/[0.03]'>
              <Logo className='size-6 text-black' />
            </div>
            <div>
              <div className='text-[10px] font-semibold uppercase tracking-[0.35em] text-black/55'>
                {brandCaption}
              </div>
              <div className='mt-1 text-[15px] font-bold leading-5 tracking-[0.12em]'>{companyName}</div>
            </div>
          </div>
          <div className='flex-1 pt-2'>
            <h1 className='text-2xl font-bold tracking-[0.22em]'>{title}</h1>
          </div>
          <div className='min-w-[140px] border border-black px-3 py-2 text-right text-[11px] leading-5'>
            <div className='text-black/65'>{documentNoLabel}</div>
            <div className='font-bold'>{documentNo || '--'}</div>
          </div>
        </div>
        <div className='mt-4 flex justify-between border-t border-dashed border-black/30 pt-3 text-[11px]'>
          <span>
            {documentNoLabel}：{documentNo || '--'}
          </span>
          <span>打印时间：{formatPurchasePrintDateTime(new Date().toISOString())}</span>
        </div>
      </div>

      {children}

      <div className='mt-10 border-t border-dashed border-black/40 pt-3 text-[10px] leading-5 text-black/65'>
        <div className='flex items-start justify-between gap-4'>
          <span className='flex-1'>{footerNote}</span>
          <span className='shrink-0'>{editionText}</span>
        </div>
      </div>
    </div>
  )
}

export function PurchasePrintInfoGrid({ items }: PurchasePrintInfoGridProps) {
  return (
    <div className='mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm'>
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className={item.span === 2 ? 'col-span-2' : undefined}>
          <span className='font-bold'>{item.label}：</span>
          {item.value?.trim() || '--'}
        </div>
      ))}
    </div>
  )
}

export function PurchasePrintSection({
  title,
  description,
  pageBreakBefore = false,
  children,
}: PurchasePrintSectionProps) {
  return (
    <section className={pageBreakBefore ? 'purchase-print-page-break mt-8' : 'mt-8'}>
      <div className='border-b border-black pb-2'>
        <h2 className='text-base font-bold tracking-[0.08em]'>{title}</h2>
        {description ? <p className='mt-1 text-[10px] leading-5 text-black/70'>{description}</p> : null}
      </div>
      <div className='mt-4'>{children}</div>
    </section>
  )
}

export function PurchasePrintMetaRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className='flex gap-2 border-b border-dashed border-black/20 py-1 last:border-b-0'>
      <span className='min-w-[72px] font-bold text-black/70'>{label}</span>
      <span className='flex-1'>{value?.trim() || '--'}</span>
    </div>
  )
}

export function PurchasePrintPhotoCard({
  title,
  photoLabel,
  photoName,
  photoUrl,
  metaRows,
}: PurchasePrintPhotoCardProps) {
  return (
    <div className='purchase-print-avoid-break purchase-print-photo-card space-y-0 border border-black'>
      <div className='border-b border-black bg-gray-100 px-3 py-2 text-[11px] font-bold'>{title}</div>
      <div className='bg-white p-3'>
        <div className='overflow-hidden border border-black'>
          <img
            src={getStaticEvidenceUrl(photoUrl)}
            alt={photoName}
            className='purchase-print-photo-image w-full object-cover'
          />
        </div>
        <div className='mt-3 space-y-1 text-[10px] leading-5'>
          <PurchasePrintMetaRow label='照片编号' value={photoLabel} />
          <PurchasePrintMetaRow label='文件名称' value={photoName} />
          {metaRows.map((item, index) => (
            <PurchasePrintMetaRow key={`${item.label}-${index}`} label={item.label} value={item.value} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function PurchasePrintSignatureGrid({ entries }: PurchasePrintSignatureGridProps) {
  const gridColumns =
    entries.length >= 4 ? 'grid-cols-2' : entries.length === 3 ? 'grid-cols-3' : 'grid-cols-2'

  return (
    <div
      className={`purchase-print-signature-grid mt-14 grid border-t border-dashed border-black/40 pt-8 text-xs ${gridColumns}`}
    >
      {entries.map((entry) => (
        <div key={`${entry.label}-${entry.value || ''}`} className='purchase-print-signature-cell'>
          <div>
            {entry.label}：{entry.value?.trim() || '______________'}
          </div>
          <div className='text-black/45'>日期：______________</div>
        </div>
      ))}
    </div>
  )
}
