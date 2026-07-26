import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  PackageSearch,
  Plus,
  Settings2,
  TriangleAlert,
} from 'lucide-react'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import type { PackagingProfile } from '@/features/logistics-packaging-management/packaging-rules-service'
import type { SalesOrder } from '../../data/schema'
import type { SalesOrderPackagingCardViewModel } from '../../utils/sales-order-packaging-card-view-model'
import {
  SalesOrderPackagingEntryView,
  type SalesOrderPackagingEntryStateMeta,
} from './sales-order-packaging-entry-view'

interface SalesOrderPackagingEntryProps {
  order: SalesOrder
  viewModel: SalesOrderPackagingCardViewModel
  readonly?: boolean
  isSelectionPending: boolean
  isFormSavePending: boolean
  onPersistLineSelection: (
    order: SalesOrder,
    lineNo: number,
    profile: PackagingProfile
  ) => void
  onStartCreateRule: (
    order: SalesOrder,
    lineNo: number,
    productId?: string
  ) => void
  onEditRule: (profile: PackagingProfile) => void
}

export function SalesOrderPackagingEntry({
  order,
  viewModel,
  readonly = false,
  isSelectionPending,
  isFormSavePending,
  onPersistLineSelection,
  onStartCreateRule,
  onEditRule,
}: SalesOrderPackagingEntryProps) {
  const { t } = useLanguage()
  const [selectOpen, setSelectOpen] = useState(false)
  const { target, preview, profiles, isLoading, isError, error } = viewModel
  const actionLine =
    target && target.state !== 'no_lines' ? target.actionLine : null

  const persistLineSelection = (lineNo: number, profile: PackagingProfile) => {
    if (readonly) {
      return
    }

    onPersistLineSelection(order, lineNo, profile)
    setSelectOpen(false)
  }

  const summary = preview?.summary ?? null
  const warningCount = summary?.warnings.length ?? 0
  const hasComputedSummary = Boolean(summary && summary.totalBoxCount > 0)

  const stateMeta = useMemo<SalesOrderPackagingEntryStateMeta>(() => {
    if (!target) {
      return {
        badgeClassName:
          'border-muted-foreground/20 bg-muted/20 text-muted-foreground',
        surfaceClassName: 'border-muted/40 bg-background/80 hover:bg-muted/10',
        icon: PackageSearch,
        title: '准备中',
        hint: '正在同步包装规则与产品包装选项',
      }
    }

    if (target.state === 'no_lines') {
      return {
        badgeClassName: 'border-amber-500/20 bg-amber-500/10 text-amber-600',
        surfaceClassName:
          'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10',
        icon: TriangleAlert,
        title: t('tradingSalesOrder.packagingPreview.entry.noLinesTitle'),
        hint: t('tradingSalesOrder.packagingPreview.entry.noLinesHint'),
      }
    }

    if (target.state === 'resolved') {
      return {
        badgeClassName:
          'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
        surfaceClassName:
          'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10',
        icon: Settings2,
        title: '已选包装',
        hint:
          target.lineCount === 1 && actionLine?.selectedPackaging
            ? actionLine.selectedPackaging.profileName
            : `已完成 ${target.resolvedLineCount}/${target.lineCount} 行包装选择`,
      }
    }

    if (target.state === 'needs_selection') {
      return {
        badgeClassName: 'border-amber-500/20 bg-amber-500/10 text-amber-600',
        surfaceClassName:
          'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10',
        icon: ChevronDown,
        title: '待选包装',
        hint: `还有 ${target.pendingSelectionLineCount} 行待选择包装`,
      }
    }

    if (target.state === 'create_new') {
      return {
        badgeClassName: 'border-rose-500/20 bg-rose-500/10 text-rose-600',
        surfaceClassName:
          'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10',
        icon: Plus,
        title: '待建规则',
        hint: `还有 ${target.createRuleLineCount} 行缺少可用包装规则`,
      }
    }

    return {
      badgeClassName: 'border-amber-500/20 bg-amber-500/10 text-amber-600',
      surfaceClassName:
        'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10',
      icon: TriangleAlert,
      title: '缺少产品',
      hint: `还有 ${target.missingProductLineCount} 行未绑定产品`,
    }
  }, [actionLine?.selectedPackaging, t, target])

  const lineSummaryText = useMemo(() => {
    if (!target || target.state === 'no_lines') {
      return null
    }

    if (target.state === 'resolved') {
      if (target.lineCount === 1 && actionLine?.selectedPackaging) {
        return `${actionLine.selectedPackaging.profileName} · ${actionLine.productDisplayTitle} · ${actionLine.qty} ${actionLine.uom}`
      }

      return `已完成 ${target.resolvedLineCount}/${target.lineCount} 行包装选择`
    }

    if (!actionLine) {
      return null
    }

    const prefix =
      target.state === 'needs_selection'
        ? '待选行'
        : target.state === 'create_new'
          ? '待建规则行'
          : '缺产品行'

    return `${prefix} ${actionLine.lineNo} · ${actionLine.productDisplayTitle} · ${actionLine.qty} ${actionLine.uom}`
  }, [actionLine, target])

  useEffect(() => {
    if (isError && error) {
      failLoudly(error, 'SalesOrderPackagingEntry')
    }
  }, [error, isError])

  return (
    <SalesOrderPackagingEntryView
      orderId={order.id}
      target={target}
      profiles={profiles}
      summary={summary}
      stateMeta={stateMeta}
      warningCount={warningCount}
      hasComputedSummary={hasComputedSummary}
      lineSummaryText={lineSummaryText}
      isLoading={isLoading}
      selectOpen={selectOpen}
      readonly={readonly}
      isSelectionPending={isSelectionPending}
      isFormSavePending={isFormSavePending}
      onSelectOpenChange={setSelectOpen}
      onPersistLineSelection={persistLineSelection}
      onStartCreateRule={(lineNo, productId) => {
        if (!productId || readonly) {
          return
        }
        onStartCreateRule(order, lineNo, productId)
      }}
      onEditRule={onEditRule}
    />
  )
}
