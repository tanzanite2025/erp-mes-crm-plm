import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import type { QualityDefectConfigurationInteractionState } from '../hooks/use-quality-defect-type-configuration'
import { QualityDefectTypeCatalogManagementPanel } from './quality-defect-type-catalog-management-panel'
import { QualityInspectionStageDefectTypeBindingPanel } from './quality-inspection-stage-defect-type-binding-panel'

type QualityDefectTypeConfigurationContentProps = {
  onInteractionStateChange?: (
    state: QualityDefectConfigurationInteractionState
  ) => void
}

export function QualityDefectTypeConfigurationContent(
  props: QualityDefectTypeConfigurationContentProps
) {
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  return <QualityDefectTypeConfigurationPanels key={actorId} {...props} />
}

function QualityDefectTypeConfigurationPanels({
  onInteractionStateChange,
}: QualityDefectTypeConfigurationContentProps) {
  const [catalogState, setCatalogState] =
    useState<QualityDefectConfigurationInteractionState>({
      hasUnsavedChanges: false,
      isSaving: false,
    })
  const [bindingState, setBindingState] =
    useState<QualityDefectConfigurationInteractionState>({
      hasUnsavedChanges: false,
      isSaving: false,
    })
  const hasUnsavedChanges =
    catalogState.hasUnsavedChanges || bindingState.hasUnsavedChanges
  const isSaving = catalogState.isSaving || bindingState.isSaving

  useEffect(() => {
    onInteractionStateChange?.({ hasUnsavedChanges, isSaving })
  }, [hasUnsavedChanges, isSaving, onInteractionStateChange])

  return (
    <div className='grid min-w-0 items-start gap-5 xl:grid-cols-2'>
      <QualityDefectTypeCatalogManagementPanel
        disabled={bindingState.isSaving}
        onInteractionStateChange={setCatalogState}
      />
      <QualityInspectionStageDefectTypeBindingPanel
        disabled={catalogState.isSaving}
        onInteractionStateChange={setBindingState}
      />
    </div>
  )
}
