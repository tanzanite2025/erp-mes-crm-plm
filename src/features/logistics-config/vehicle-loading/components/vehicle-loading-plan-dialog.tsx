import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  VehicleLoadingPreviewScene,
  VehicleLoadingReferenceComparisonInput,
} from '../data/vehicle-loading-preview-scene.types'
import {
  parseVehicleLoadingLayoutSnapshotJson,
  serializeVehicleLoadingLayoutSnapshot,
} from '../services/vehicle-loading-layout-snapshot-json'
import { buildVehicleLoadingReferenceComparisonFromLayoutSnapshot } from '../services/vehicle-loading-reference-comparison'
import { VehicleLoadingPreviewWorkspace } from './vehicle-loading-preview-workspace'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  scene: VehicleLoadingPreviewScene
  onRetryCalculation?: () => void
}

type ImportedReferenceState = {
  snapshotId?: string
  references: VehicleLoadingReferenceComparisonInput[]
}

function buildSnapshotFileName(scene: VehicleLoadingPreviewScene) {
  const snapshotId = scene.layoutSnapshot?.id ?? 'vehicle-loading-layout'
  return `${snapshotId.replace(/[^a-z0-9._-]+/gi, '_')}.json`
}

export function VehicleLoadingPlanDialog({
  open,
  onOpenChange,
  scene,
  onRetryCalculation,
}: Props) {
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importedReferenceState, setImportedReferenceState] =
    useState<ImportedReferenceState>({ references: [] })
  const activeSnapshotId = scene.layoutSnapshot?.id
  const canRetryCalculation = scene.status === 'failed' && onRetryCalculation
  const canExportSnapshot = Boolean(scene.layoutSnapshot)
  const sceneWithReferenceComparisons =
    useMemo<VehicleLoadingPreviewScene>(() => {
      const importedReferenceComparisons =
        importedReferenceState.snapshotId === activeSnapshotId
          ? importedReferenceState.references
          : []

      return {
        ...scene,
        referenceComparisons: [
          ...(scene.referenceComparisons ?? []),
          ...importedReferenceComparisons,
        ],
      }
    }, [activeSnapshotId, importedReferenceState, scene])

  const handleExportSnapshot = () => {
    if (!scene.layoutSnapshot) return

    const blob = new Blob(
      [serializeVehicleLoadingLayoutSnapshot(scene.layoutSnapshot)],
      { type: 'application/json;charset=utf-8' }
    )
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = buildSnapshotFileName(scene)
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImportSnapshot = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const snapshot = parseVehicleLoadingLayoutSnapshotJson(await file.text())
      const reference =
        buildVehicleLoadingReferenceComparisonFromLayoutSnapshot(snapshot)
      setImportedReferenceState((current) => ({
        snapshotId: activeSnapshotId,
        references:
          current.snapshotId === activeSnapshotId
            ? [...current.references, reference]
            : [reference],
      }))
      toast.success(`已导入参考方案：${reference.label}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[90vh] max-h-[90vh] w-[90vw] max-w-[90vw] flex-col gap-0 rounded-[28px] border-dashed bg-background/95 p-0 shadow-xl sm:max-w-[90vw]'>
        <DialogHeader className='shrink-0 border-b border-dashed border-border/60 px-3 py-2 sm:px-4 sm:py-3'>
          <DialogTitle className='text-sm font-black tracking-tight'>
            装箱预览
          </DialogTitle>
        </DialogHeader>

        <div className='min-h-0 flex-1 overflow-hidden px-2 py-2 sm:px-3 sm:py-3'>
          <VehicleLoadingPreviewWorkspace
            scene={sceneWithReferenceComparisons}
          />
        </div>

        <div className='shrink-0 border-t border-dashed border-border/60 px-3 py-2 sm:px-4 sm:py-3'>
          <div className='flex justify-end gap-2'>
            <input
              ref={importInputRef}
              type='file'
              accept='.json,application/json'
              className='hidden'
              onChange={(event) => {
                void handleImportSnapshot(event)
              }}
            />
            <Button
              type='button'
              variant='outline'
              onClick={() => importInputRef.current?.click()}
            >
              <Upload className='size-4' />
              导入参考
            </Button>
            {canExportSnapshot ? (
              <Button
                type='button'
                variant='outline'
                onClick={handleExportSnapshot}
              >
                <Download className='size-4' />
                导出快照
              </Button>
            ) : null}
            {canRetryCalculation ? (
              <Button
                type='button'
                variant='outline'
                onClick={onRetryCalculation}
              >
                重新计算
              </Button>
            ) : null}
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              关闭
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
