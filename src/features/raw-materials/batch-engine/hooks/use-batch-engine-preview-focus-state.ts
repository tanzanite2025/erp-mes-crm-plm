import { useState } from 'react'
import type {
  BatchEngineExplainabilityTarget,
  BatchEngineExplainabilityTargetKind,
  BatchEngineExplainabilityTargetSource,
} from '../services/batch-engine-phase7-visualization'

export function useBatchEnginePreviewFocusState() {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedExplainabilityTargetId, setSelectedExplainabilityTargetId] =
    useState('')
  const [
    selectedExplainabilityTargetKind,
    setSelectedExplainabilityTargetKind,
  ] = useState<BatchEngineExplainabilityTargetKind>('')
  const [
    selectedExplainabilityTargetSource,
    setSelectedExplainabilityTargetSource,
  ] = useState<BatchEngineExplainabilityTargetSource>('')

  const clearPreviewFocus = () => {
    setSelectedExplainabilityTargetId('')
    setSelectedExplainabilityTargetKind('')
    setSelectedExplainabilityTargetSource('')
  }

  const handlePreviewOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      clearPreviewFocus()
    }
    setPreviewOpen(nextOpen)
  }

  const openPreview = () => {
    clearPreviewFocus()
    setPreviewOpen(true)
  }

  const openExplainabilityTarget = (
    target: BatchEngineExplainabilityTarget
  ) => {
    setSelectedExplainabilityTargetId(target.targetId)
    setSelectedExplainabilityTargetKind(target.targetKind)
    setSelectedExplainabilityTargetSource('home-entry')
    setPreviewOpen(true)
  }

  const selectExplainabilityTarget = (
    targetId: string,
    targetKind: Exclude<BatchEngineExplainabilityTargetKind, ''>
  ) => {
    setSelectedExplainabilityTargetId(targetId)
    setSelectedExplainabilityTargetKind(targetKind)
    setSelectedExplainabilityTargetSource('preview-switch')
  }

  return {
    previewOpen,
    selectedExplainabilityTargetId,
    selectedExplainabilityTargetKind,
    selectedExplainabilityTargetSource,
    handlePreviewOpenChange,
    openPreview,
    openExplainabilityTarget,
    selectExplainabilityTarget,
  }
}
