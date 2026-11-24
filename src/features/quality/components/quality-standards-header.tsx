import { Link } from '@tanstack/react-router'
import {
  Search,
  Plus,
  Loader2,
  ShieldCheck,
  Layers3,
  BookOpen,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'

interface QualityStandardsHeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onAdd: () => void
  onManageInspectionStages?: () => void
  onConfigureDefectTypes?: () => void
  total?: number
  isFetching?: boolean
}

export function QualityStandardsHeader({
  searchQuery,
  onSearchChange,
  onAdd,
  onManageInspectionStages,
  onConfigureDefectTypes,
  total,
  isFetching = false,
}: QualityStandardsHeaderProps) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)

  return (
    <div className='flex flex-col gap-8'>
      <IndustrialHeader
        icon={ShieldCheck}
        title={t('quality.standards.page.title')}
        description={t('quality.standards.page.description')}
      />

      <div className='flex flex-col justify-between gap-6 px-1 lg:flex-row lg:items-center'>
        <div className='flex flex-col gap-6 sm:flex-row sm:items-center'>
          <div className='flex items-center gap-6'>
            <div className='flex flex-col'>
              <span className='mb-1 text-[10px] leading-none font-semibold text-muted-foreground/60'>
                {t('quality.standards.page.activeProtocols')}
              </span>
              <div className='flex items-baseline gap-1'>
                <span className='text-2xl font-black text-primary tabular-nums'>
                  {total ?? '—'}
                </span>
                <span className='text-[10px] font-semibold text-muted-foreground/50'>
                  {t('quality.standards.page.files')}
                </span>
              </div>
            </div>
            <div className='h-8 w-px border-l border-dashed bg-muted-foreground/10' />
          </div>

          <div className='group relative flex-1'>
            <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground/30 transition-colors group-focus-within:text-primary' />
            <Input
              placeholder={t('quality.standards.page.searchPlaceholder')}
              className='h-12 w-full rounded-2xl border-none bg-muted/50 pr-11 pl-11 shadow-inner transition-all focus:bg-background sm:w-[320px] lg:w-[380px]'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {isFetching ? (
              <Loader2 className='absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-primary/70' />
            ) : null}
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-3'>
          {matchesPathPermissionProjection(
            user,
            '/quality/standard-creation-guide'
          ) && (
            <Button asChild variant='outline' className='h-11 rounded-full'>
              <Link to='/quality/standard-creation-guide'>
                <BookOpen className='size-4' />
                {t('quality.standardCreationGuide.readGuide')}
              </Link>
            </Button>
          )}
          {onManageInspectionStages ? (
            <Button
              type='button'
              variant='outline'
              onClick={onManageInspectionStages}
              className='h-11 rounded-full'
            >
              <Layers3 className='size-4' />
              {t('quality.standards.inspectionStages.manage')}
            </Button>
          ) : null}
          {onConfigureDefectTypes ? (
            <Button
              type='button'
              variant='outline'
              className='h-11 rounded-full'
              onClick={onConfigureDefectTypes}
            >
              {t('quality.defectConfiguration.quickConfigure')}
            </Button>
          ) : null}
          <AuditTimelineTriggerButton
            module={AUDIT_MODULES.qualityStandard}
            targetName={t('quality.standards.page.title')}
            label={t('common.audit.trigger')}
            className='h-11 rounded-full border-dashed bg-background/80 px-4'
          />

          <Button
            onClick={onAdd}
            className='h-11 flex-1 rounded-full px-6 sm:flex-initial'
          >
            <Plus className='size-4' />
            {t('quality.standards.page.add')}
          </Button>
        </div>
      </div>
    </div>
  )
}
