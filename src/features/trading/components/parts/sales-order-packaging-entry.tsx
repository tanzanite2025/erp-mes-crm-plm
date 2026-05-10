import { useMemo, useState } from 'react'
import { ChevronDown, PackageSearch, Plus, Settings2, TriangleAlert } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { PackagingProfileFormDialog } from '@/features/logistics-config/components/packaging-profile-form-dialog'
import { usePackagingProfileFormController } from '@/features/logistics-config/hooks/use-packaging-profile-form-controller'
import type { PackagingProfile } from '@/features/logistics-config/packaging-rules-service'
import { failLoudly } from '@/lib/safe-catch'
import { useAuthStore } from '@/stores/auth-store'
import type { SalesOrder } from '../../data/schema'
import { useSalesOrderPackagingEntry } from '../../hooks/use-sales-order-packaging-entry'
import { useSalesOrderMutations } from '../../sales'
import { requireTradingCommandActor } from '../../utils/command-actor'
import {
  buildSalesOrderLinePackagingSelection,
} from '../../utils/sales-order-packaging-selection'
import {
  SalesOrderPackagingEntryView,
  type SalesOrderPackagingEntryStateMeta,
} from './sales-order-packaging-entry-view'

interface SalesOrderPackagingEntryProps {
  order: SalesOrder
}

export function SalesOrderPackagingEntry({ order }: SalesOrderPackagingEntryProps) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const [selectOpen, setSelectOpen] = useState(false)
  const [createLineNo, setCreateLineNo] = useState<number | null>(null)
  const { lineContentChangeMutation } = useSalesOrderMutations()
  const { target, preview, profiles, isLoading, isError, error } = useSalesOrderPackagingEntry(order)
  const actionLine = target && target.state !== 'no_lines' ? target.actionLine : null

  const persistLineSelection = async (lineNo: number, profile: PackagingProfile) => {
    let actor
    try {
      actor = requireTradingCommandActor(
        { operator: user?.accountNo, actorId: user?.id },
        'SalesOrderPackagingEntry.persistLineSelection'
      )
    } catch {
      return
    }

    try {
      await lineContentChangeMutation.mutateAsync({
        orderId: order.id,
        lines: order.lines.map((line) =>
          line.lineNo === lineNo
            ? {
                ...line,
                selectedPackaging: buildSalesOrderLinePackagingSelection(profile, 'manual'),
              }
            : line
        ),
        operator: actor.operator,
        actorId: actor.actorId,
        expectedVersion: order.version,
      })
      setSelectOpen(false)
    } catch {
      return
    }
  }

  const handleProfileSaved = (saved: PackagingProfile) => {
    if (createLineNo === null) {
      setSelectOpen(false)
      return
    }

    void persistLineSelection(createLineNo, saved).finally(() => {
      setCreateLineNo(null)
    })
  }

  const formController = usePackagingProfileFormController({
    initialProductId: actionLine?.productId,
    onSaveSuccess: handleProfileSaved,
  })

  const summary = preview.data?.summary ?? null
  const warningCount = summary?.warnings.length ?? 0
  const hasComputedSummary = Boolean(summary && summary.totalBoxCount > 0)

  const stateMeta = useMemo<SalesOrderPackagingEntryStateMeta>(() => {
    if (!target) {
      return {
        badgeClassName: 'border-muted-foreground/20 bg-muted/20 text-muted-foreground',
        surfaceClassName: 'border-muted/40 bg-background/80 hover:bg-muted/10',
        icon: PackageSearch,
        title: '准备中',
        hint: '正在同步包装规则与产品包装选项',
      }
    }

    if (target.state === 'no_lines') {
      return {
        badgeClassName: 'border-amber-500/20 bg-amber-500/10 text-amber-600',
        surfaceClassName: 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10',
        icon: TriangleAlert,
        title: t('tradingSalesOrder.packagingPreview.entry.noLinesTitle'),
        hint: t('tradingSalesOrder.packagingPreview.entry.noLinesHint'),
      }
    }

    if (target.state === 'resolved') {
      return {
        badgeClassName: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600',
        surfaceClassName: 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10',
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
        surfaceClassName: 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10',
        icon: ChevronDown,
        title: '待选包装',
        hint: `还有 ${target.pendingSelectionLineCount} 行待选择包装`,
      }
    }

    if (target.state === 'create_new') {
      return {
        badgeClassName: 'border-rose-500/20 bg-rose-500/10 text-rose-600',
        surfaceClassName: 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10',
        icon: Plus,
        title: '待建规则',
        hint: `还有 ${target.createRuleLineCount} 行缺少可用包装规则`,
      }
    }

    return {
      badgeClassName: 'border-amber-500/20 bg-amber-500/10 text-amber-600',
      surfaceClassName: 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10',
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

  if (isError && error) {
    failLoudly(error, 'SalesOrderPackagingEntry')
  }

  return (
    <>
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
        isSelectionPending={lineContentChangeMutation.isPending}
        isFormSavePending={formController.savePending}
        onSelectOpenChange={setSelectOpen}
        onPersistLineSelection={(lineNo, profile) => {
          void persistLineSelection(lineNo, profile)
        }}
        onStartCreateRule={(lineNo, productId) => {
          if (!productId) {
            return
          }
          setCreateLineNo(lineNo)
          formController.handleCreate(productId)
        }}
        onEditRule={(profile) => {
          formController.handleEdit(profile)
        }}
      />

      <PackagingProfileFormDialog
        open={formController.open}
        draft={formController.draft}
        products={formController.products}
        packagingMaterials={formController.packagingMaterials}
        packagingMaterialOptions={formController.packagingMaterialOptions}
        dimensionUnits={formController.dimensionUnits}
        weightUnits={formController.weightUnits}
        quantityUnits={formController.quantityUnits}
        resolvedDimensionUnitCode={formController.resolvedDimensionUnitCode}
        resolvedWeightUnitCode={formController.resolvedWeightUnitCode}
        resolvedCapacityUnitCode={formController.resolvedCapacityUnitCode}
        selectedPackagingMaterialId={formController.selectedPackagingMaterialId}
        selectedProduct={formController.selectedProduct}
        computedVolume={formController.computedVolume}
        computedGrossWeight={formController.computedGrossWeight}
        savePending={formController.savePending}
        packagingMaterialsLoading={formController.packagingMaterialsLoading}
        onOpenChange={formController.setOpen}
        onDraftChange={formController.setDraft}
        onPackagingMaterialChange={formController.updateSelectedPackagingMaterial}
        onProductChange={formController.updateSelectedProduct}
        onDimensionUnitChange={(value) =>
          formController.setDraft((current) => ({
            ...current,
            dimensionUnitCode: value,
          }))
        }
        onWeightUnitChange={(value) =>
          formController.setDraft((current) => ({
            ...current,
            weightUnitCode: value,
          }))
        }
        onCapacityUnitChange={(value) =>
          formController.setDraft((current) => ({
            ...current,
            capacityUnitCode: value,
          }))
        }
        onSave={formController.handleSave}
      />
    </>
  )
}
