import {
  Archive,
  Ban,
  CheckCircle2,
  CircleEllipsis,
  FileClock,
  LayoutGrid,
  Loader2,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import type {
  QualityStandardsListStats,
  QualityStandardsStatusFilter,
} from '../types/quality-standards-list'

interface QualityStandardsStatusOverviewProps {
  stats: QualityStandardsListStats
  value: QualityStandardsStatusFilter
  onChange: (value: QualityStandardsStatusFilter) => void
  isLoading?: boolean
}

export function QualityStandardsStatusOverview({
  stats,
  value,
  onChange,
  isLoading = false,
}: QualityStandardsStatusOverviewProps) {
  const { t } = useLanguage()

  const items: Array<{
    value: QualityStandardsStatusFilter
    icon: typeof LayoutGrid
    label: string
    count: number
    description: string
  }> = [
    {
      value: 'ALL',
      icon: LayoutGrid,
      label: t('quality.standards.page.statusViewAll'),
      count: stats.total,
      description: t('quality.standards.page.statusViewAllDescription'),
    },
    {
      value: 'DRAFT',
      icon: FileClock,
      label: t('quality.standards.values.statusDraft'),
      count: stats.draft,
      description: t('quality.standards.page.statusViewDraftDescription'),
    },
    {
      value: 'PENDING_APPROVAL',
      icon: Send,
      label: t('quality.standards.values.statusPendingApproval'),
      count: stats.pendingApproval,
      description: t('quality.standards.page.statusViewPendingApprovalDescription'),
    },
    {
      value: 'APPROVED',
      icon: CircleEllipsis,
      label: t('quality.standards.values.statusApproved'),
      count: stats.approved,
      description: t('quality.standards.page.statusViewApprovedDescription'),
    },
    {
      value: 'REJECTED',
      icon: Ban,
      label: t('quality.standards.values.statusRejected'),
      count: stats.rejected,
      description: t('quality.standards.page.statusViewRejectedDescription'),
    },
    {
      value: 'PUBLISHED',
      icon: CheckCircle2,
      label: t('quality.standards.values.statusPublished'),
      count: stats.published,
      description: t('quality.standards.page.statusViewPublishedDescription'),
    },
    {
      value: 'ARCHIVED',
      icon: Archive,
      label: t('quality.standards.values.statusArchived'),
      count: stats.archived,
      description: t('quality.standards.page.statusViewArchivedDescription'),
    },
  ]

  return (
    <div className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-4 shadow-inner lg:p-5'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <p className='text-[10px] font-black tracking-[0.24em] text-muted-foreground/55 uppercase'>
            {t('quality.standards.page.statusViewTitle')}
          </p>
          <p className='mt-1 text-[11px] leading-5 text-muted-foreground/70'>
            {t('quality.standards.page.statusViewDescription')}
          </p>
        </div>
        {isLoading ? (
          <div className='inline-flex items-center gap-2 rounded-full border border-dashed border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-black tracking-widest text-primary uppercase'>
            <Loader2 className='size-3.5 animate-spin' />
            {t('common.actions.loading')}
          </div>
        ) : null}
      </div>

      <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
        {items.map((item) => {
          const Icon = item.icon
          const isActive = value === item.value

          return (
            <button
              key={item.value}
              type='button'
              onClick={() => onChange(item.value)}
              className={cn(
                'group flex items-start gap-3 rounded-[24px] border border-dashed p-4 text-left transition-all',
                isActive
                  ? 'border-primary/35 bg-primary/8 shadow-lg shadow-primary/5'
                  : 'border-muted/40 bg-background/70 hover:border-primary/20 hover:bg-primary/5'
              )}
            >
              <div
                className={cn(
                  'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border transition-colors',
                  isActive
                    ? 'border-primary/20 bg-primary/12 text-primary'
                    : 'border-muted/30 bg-muted/20 text-muted-foreground/55 group-hover:text-primary'
                )}
              >
                <Icon className='size-4' />
              </div>
              <div className='min-w-0'>
                <div className='flex items-start justify-between gap-3'>
                  <p
                    className={cn(
                      'text-[10px] font-black tracking-widest uppercase',
                      isActive ? 'text-primary' : 'text-foreground/85'
                    )}
                  >
                    {item.label}
                  </p>
                  <div className='shrink-0 text-right'>
                    <div
                      className={cn(
                        'text-xl font-black tracking-tight tabular-nums',
                        isActive ? 'text-primary' : 'text-foreground/90'
                      )}
                    >
                      {item.count}
                    </div>
                    <div className='text-[9px] font-bold tracking-widest text-muted-foreground/45 uppercase'>
                      {t('quality.standards.page.files')}
                    </div>
                  </div>
                </div>
                <p className='mt-1 text-[11px] leading-5 text-muted-foreground/70'>
                  {item.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
