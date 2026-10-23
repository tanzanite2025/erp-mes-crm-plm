import { useMemo, useState } from 'react'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import { type BOM } from '../data/schema'
import {
  getBOMProductPerformanceVersionWeightDraftKey,
  type BOMProductPerformanceVersionWeightSource,
} from '../utils/bom-product-performance-version-weight-comparison'
import { useBOMProductPerformanceVersionWeightComparison } from './use-bom-product-performance-version-weight-comparison'

/** Only coordinates performance-version weight drafts; never writes recipe items or saves a BOM. */
export function useBOMPerformanceVersionWeightDrafts(form: UseFormReturn<BOM>) {
  const [
    id,
    productId,
    bomType,
    ownerType,
    ownerCustomerId,
    versionLevel,
    measuredWeight,
    measuredWeightUnit,
    bomVersion,
    status,
    isLocked,
  ] = useWatch({
    control: form.control,
    name: [
      'id',
      'productId',
      'bomType',
      'ownerType',
      'ownerCustomerId',
      'versionLevel',
      'measuredWeight',
      'measuredWeightUnit',
      'bomVersion',
      'status',
      'isLocked',
    ],
  })
  const currentBOM: BOMProductPerformanceVersionWeightSource = {
    id: id ?? '',
    productId: productId ?? '',
    bomType: bomType ?? 'EBOM',
    ownerType: ownerType ?? 'INTERNAL',
    ownerCustomerId,
    versionLevel: versionLevel ?? '',
    measuredWeight: measuredWeight ?? 0,
    measuredWeightUnit: measuredWeightUnit ?? '',
    bomVersion: bomVersion ?? 'V1.0',
    status: status ?? 'DRAFT',
    isLocked: isLocked ?? false,
  }
  const comparison = useBOMProductPerformanceVersionWeightComparison(currentBOM)
  const [versionWeightDrafts, setVersionWeightDrafts] = useState(
    () => new Map<string, BOMProductPerformanceVersionWeightSource>()
  )
  const currentPerformanceVersion = currentBOM.versionLevel
  const currentWeightDraftScopeKey =
    getBOMProductPerformanceVersionWeightDraftKey(currentBOM, '')
  const displayedVersionWeights = useMemo(() => {
    const weights = new Map(comparison.versionWeights)
    for (const weightDraft of versionWeightDrafts.values()) {
      if (
        weightDraft.versionLevel &&
        weightDraft.versionLevel !== currentPerformanceVersion &&
        getBOMProductPerformanceVersionWeightDraftKey(weightDraft, '') ===
          currentWeightDraftScopeKey
      ) {
        weights.set(weightDraft.versionLevel, {
          bom: weightDraft,
          isCurrentBOM: false,
          isSessionDraft: true,
        })
      }
    }
    return weights
  }, [
    comparison.versionWeights,
    currentPerformanceVersion,
    currentWeightDraftScopeKey,
    versionWeightDrafts,
  ])

  function updateCurrentBOMPerformanceVersionWeight(
    weight: number,
    unit: string
  ) {
    if (currentBOM.isLocked || !Number.isFinite(weight) || weight < 0) return
    form.setValue('measuredWeight', weight, {
      shouldDirty: true,
      shouldValidate: true,
    })
    form.setValue('measuredWeightUnit', unit, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function selectCurrentBOMPerformanceVersionWithItsWeight(
    versionValue: string
  ) {
    if (
      !currentBOM.productId ||
      !versionValue ||
      currentBOM.isLocked ||
      currentBOM.versionLevel === versionValue
    )
      return
    setVersionWeightDrafts((previousDrafts) =>
      new Map(previousDrafts).set(
        getBOMProductPerformanceVersionWeightDraftKey(currentBOM),
        currentBOM
      )
    )
    const nextWeight =
      versionWeightDrafts.get(
        getBOMProductPerformanceVersionWeightDraftKey(currentBOM, versionValue)
      ) ??
      comparison.versionWeights.get(versionValue)?.bom ??
      (!currentBOM.versionLevel ? currentBOM : undefined)
    form.setValue('versionLevel', versionValue, { shouldDirty: true })
    updateCurrentBOMPerformanceVersionWeight(
      nextWeight?.measuredWeight ?? 0,
      nextWeight?.measuredWeightUnit ?? ''
    )
  }

  function clearVersionWeightWhenBOMProductOrOwnershipChanges() {
    if (currentBOM.isLocked) return
    setVersionWeightDrafts(new Map())
    form.setValue('versionLevel', '', { shouldDirty: true })
    updateCurrentBOMPerformanceVersionWeight(0, '')
  }

  return {
    currentBOM,
    versionWeights: displayedVersionWeights,
    isLoading: comparison.isLoading,
    error: comparison.error,
    retry: comparison.retry,
    onSelectVersion: selectCurrentBOMPerformanceVersionWithItsWeight,
    onWeightChange: updateCurrentBOMPerformanceVersionWeight,
    onProductOrOwnershipChange:
      clearVersionWeightWhenBOMProductOrOwnershipChanges,
  }
}

export type BOMPerformanceVersionWeightDrafts = ReturnType<
  typeof useBOMPerformanceVersionWeightDrafts
>
