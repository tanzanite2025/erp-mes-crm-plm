import {
  Boxes,
  ChevronDown,
  Plus,
  Settings2,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/context/language-provider'
import type { PackagingProfile } from '@/features/logistics-config/packaging-rules-service'
import type { SalesOrderPackagingEntryTarget } from '../../hooks/use-sales-order-packaging-entry'
import type { SalesOrderPackagingPreviewSummary } from '../../hooks/use-sales-order-packaging-preview'
import {
  createPackagingProfileFromSelection,
  findPackagingProfileById,
} from '../../utils/sales-order-packaging-selection'

export interface SalesOrderPackagingEntryStateMeta {
  badgeClassName: string
  surfaceClassName: string
  icon: LucideIcon
  title: string
  hint: string
}

interface SalesOrderPackagingEntryViewProps {
  orderId: string
  target: SalesOrderPackagingEntryTarget | null
  profiles: PackagingProfile[]
  summary: SalesOrderPackagingPreviewSummary | null
  stateMeta: SalesOrderPackagingEntryStateMeta
  warningCount: number
  hasComputedSummary: boolean
  lineSummaryText: string | null
  isLoading: boolean
  selectOpen: boolean
  isSelectionPending: boolean
  isFormSavePending: boolean
  onSelectOpenChange: (open: boolean) => void
  onPersistLineSelection: (lineNo: number, profile: PackagingProfile) => void
  onStartCreateRule: (lineNo: number, productId?: string) => void
  onEditRule: (profile: PackagingProfile) => void
}

export function SalesOrderPackagingEntryView({
  orderId,
  target,
  profiles,
  summary,
  stateMeta,
  warningCount,
  hasComputedSummary,
  lineSummaryText,
  isLoading,
  selectOpen,
  isSelectionPending,
  isFormSavePending,
  onSelectOpenChange,
  onPersistLineSelection,
  onStartCreateRule,
  onEditRule,
}: SalesOrderPackagingEntryViewProps) {
  const { t } = useLanguage()
  const StateIcon = stateMeta.icon

  const renderMetrics = () => {
    if (!summary) {
      return (
        <div className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/55'>
          {stateMeta.hint}
        </div>
      )
    }

    if (!hasComputedSummary) {
      return (
        <div className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/55'>
          {target?.state === 'resolved'
            ? '已选包装，当前尚未形成有效装箱结果'
            : stateMeta.hint}
        </div>
      )
    }

    return (
      <div className='flex flex-wrap gap-1.5'>
        <span className='inline-flex items-center gap-1 rounded-full border border-dashed border-primary/15 bg-background/80 px-2 py-1 text-[8px] font-black tracking-widest text-foreground/80'>
          <span className='text-muted-foreground/55'>箱</span>
          <span>{summary.totalBoxCount}</span>
        </span>
        <span className='inline-flex items-center gap-1 rounded-full border border-dashed border-primary/15 bg-background/80 px-2 py-1 text-[8px] font-black tracking-widest text-foreground/80'>
          <span className='text-muted-foreground/55'>体积</span>
          <span>{summary.totalVolume.toFixed(2)}</span>
        </span>
        <span className='inline-flex items-center gap-1 rounded-full border border-dashed border-primary/15 bg-background/80 px-2 py-1 text-[8px] font-black tracking-widest text-foreground/80'>
          <span className='text-muted-foreground/55'>毛重</span>
          <span>{summary.totalGrossWeight.toFixed(2)}</span>
        </span>
      </div>
    )
  }

  const content = (
    <div className={`w-full rounded-[24px] border border-dashed px-2.5 py-2 text-left transition-colors ${stateMeta.surfaceClassName}`}>
      <div className='flex items-start justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-1.5'>
          <span className='inline-flex items-center gap-1 rounded-full border border-dashed border-primary/15 bg-background/80 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-primary/75'>
            <Boxes className='size-3' />
            {t('tradingSalesOrder.packagingPreview.title')}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${stateMeta.badgeClassName}`}>
            <StateIcon className='size-3' />
            {stateMeta.title}
          </span>
          {warningCount > 0 ? (
            <span className='inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-amber-700'>
              <TriangleAlert className='size-3' />
              {warningCount}
            </span>
          ) : null}
        </div>
        {target && target.state !== 'no_lines' ? (
          <ChevronDown className='mt-1 size-3.5 shrink-0 text-muted-foreground/50' />
        ) : null}
      </div>

      <div className='mt-1.5 space-y-1'>
        {renderMetrics()}
        {lineSummaryText ? (
          <div className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>
            {lineSummaryText}
          </div>
        ) : !target && isLoading ? (
          <div className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>
            正在同步包装入口状态
          </div>
        ) : null}
      </div>
    </div>
  )

  if (!target && isLoading) {
    return content
  }

  if (!target) {
    return (
      <div className='rounded-[24px] border border-dashed border-muted/40 bg-background/80 px-3 py-2.5'>
        <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
          <TriangleAlert className='size-3' />
          暂无可配置包装入口
        </div>
      </div>
    )
  }

  if (target.state === 'no_lines') {
    return content
  }

  return (
    <div className='space-y-1'>
      <Popover open={selectOpen} onOpenChange={onSelectOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            data-order-row-action='true'
            className='h-auto w-full rounded-[24px] p-0 hover:bg-transparent'
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            {content}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align='start'
          className='w-[360px] rounded-[24px] border border-dashed p-3 shadow-xl'
          onClick={(event) => event.stopPropagation()}
        >
          <div className='space-y-3'>
            <div>
              <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                订单行包装选择
              </p>
              <h4 className='mt-1 text-sm font-black italic tracking-tight'>
                {stateMeta.title}
              </h4>
              <p className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                {stateMeta.hint}
              </p>
            </div>

            <div className='max-h-[360px] space-y-2 overflow-y-auto pr-1'>
              {target.lines.map((line) => {
                const optionProfiles =
                  line.selectedPackaging &&
                  !line.candidateProfiles.some(
                    (profile) => profile.id === line.selectedPackaging?.profileId
                  )
                    ? [
                        createPackagingProfileFromSelection(line.selectedPackaging),
                        ...line.candidateProfiles,
                      ]
                    : line.candidateProfiles
                const editableProfile = findPackagingProfileById(
                  profiles,
                  line.selectedPackaging?.profileId
                )
                const statusBadgeClassName =
                  line.state === 'resolved'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                    : line.state === 'needs_selection'
                      ? 'border-amber-500/20 bg-amber-500/10 text-amber-600'
                      : line.state === 'create_new'
                        ? 'border-rose-500/20 bg-rose-500/10 text-rose-600'
                        : 'border-amber-500/20 bg-amber-500/10 text-amber-600'
                const statusLabel =
                  line.state === 'resolved'
                    ? '已选'
                    : line.state === 'needs_selection'
                      ? '待选'
                      : line.state === 'create_new'
                        ? '建规则'
                        : '缺产品'

                return (
                  <div
                    key={`${orderId}-${line.lineNo}`}
                    className='rounded-[20px] border border-dashed bg-muted/10 px-3 py-3'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                          LINE {line.lineNo}
                        </p>
                        <h4 className='mt-1 text-sm font-black italic tracking-tight'>
                          {line.productDisplayTitle}
                        </h4>
                        {line.productDisplaySubtitle ? (
                          <p className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                            {line.productDisplaySubtitle}
                          </p>
                        ) : null}
                        <p className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                          {line.qty} {line.uom}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${statusBadgeClassName}`}>
                        {statusLabel}
                      </span>
                    </div>

                    {line.selectedPackaging ? (
                      <p className='mt-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/65'>
                        当前：{line.selectedPackaging.profileName}
                        {' · '}
                        {line.selectedPackaging.capacity}
                        {' '}
                        {line.selectedPackaging.capacityUnitCode}
                      </p>
                    ) : null}

                    {line.state === 'missing_product' ? (
                      <p className='mt-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                        请先在订单行绑定产品后再配置包装
                      </p>
                    ) : null}

                    {optionProfiles.length > 0 ? (
                      <div className='mt-3 space-y-2'>
                        <Select
                          value={line.selectedPackaging?.profileId}
                          onValueChange={(profileId) => {
                            const profile =
                              optionProfiles.find((item) => item.id === profileId) ??
                              findPackagingProfileById(profiles, profileId)

                            if (!profile) {
                              return
                            }

                            onPersistLineSelection(line.lineNo, profile)
                          }}
                        >
                          <SelectTrigger className='h-11 rounded-2xl border-none bg-muted/50 text-[10px] font-black uppercase tracking-widest'>
                            <SelectValue placeholder='选择包装定义' />
                          </SelectTrigger>
                          <SelectContent className='rounded-[24px] border border-dashed'>
                            {optionProfiles.map((profile) => (
                              <SelectItem
                                key={profile.id}
                                value={profile.id}
                                className='text-[10px] font-black uppercase tracking-widest'
                              >
                                {profile.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/55'>
                          {line.selectedPackaging
                            ? `${line.selectedPackaging.profileCode} · ${line.selectedPackaging.length}×${line.selectedPackaging.width}×${line.selectedPackaging.height} ${line.selectedPackaging.dimensionUnitCode}`
                            : `可选 ${optionProfiles.length} 条活跃包装定义`}
                        </div>
                      </div>
                    ) : null}

                    <div className='mt-3 flex flex-wrap gap-2'>
                      {line.state === 'create_new' ? (
                        <Button
                          type='button'
                          variant='default'
                          className='h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest'
                          disabled={isSelectionPending || isFormSavePending}
                          onClick={() => {
                            onStartCreateRule(line.lineNo, line.productId)
                          }}
                        >
                          <Plus className='size-3.5' />
                          {t('logisticsConfig.packagingRules.addRule')}
                        </Button>
                      ) : null}

                      {editableProfile ? (
                        <Button
                          type='button'
                          variant='ghost'
                          className='h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-widest'
                          onClick={() => {
                            onEditRule(editableProfile)
                          }}
                        >
                          <Settings2 className='size-3.5' />
                          编辑规则
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
