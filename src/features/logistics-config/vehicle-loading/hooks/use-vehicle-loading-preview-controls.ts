import { useState } from 'react'
import type { VehicleLoadingPreviewScene } from '../data/vehicle-loading-preview-scene.types'

type Props = {
  scene: VehicleLoadingPreviewScene
}

type PreviewControlsState = {
  sceneKey: string
  activeLayerIndex: number
  zoomPercent: number
}

function buildPreviewSceneKey(scene: VehicleLoadingPreviewScene) {
  return [
    scene.status,
    scene.renderer,
    scene.errorMessage ?? '',
    scene.vehicle.name,
    scene.placement.orientation.label,
    scene.placement.boxesPerLayer,
    scene.placement.layerCount,
    scene.placement.maxBoxes,
    scene.layers
      .map(
        (layer) =>
          `${layer.layerIndex}:${layer.boxesInLayer}:${
            layer.placements
              ?.map(
                (placement) =>
                  `${placement.packageIndex},${placement.positionMm.xMm},${placement.positionMm.yMm},${placement.positionMm.zMm}`
              )
              .join(';') ?? ''
          }`
      )
      .join('|'),
  ].join('::')
}

function buildInitialPreviewControlsState(
  sceneKey: string
): PreviewControlsState {
  return {
    sceneKey,
    activeLayerIndex: 0,
    zoomPercent: 100,
  }
}

function normalizePreviewControlsState(
  state: PreviewControlsState,
  sceneKey: string
) {
  return state.sceneKey === sceneKey
    ? state
    : buildInitialPreviewControlsState(sceneKey)
}

function clampLayerIndex(layerIndex: number, layerCount: number) {
  return Math.min(Math.max(layerIndex, 0), Math.max(layerCount - 1, 0))
}

export function useVehicleLoadingPreviewControls({ scene }: Props) {
  const sceneKey = buildPreviewSceneKey(scene)
  const layerCount = Math.max(scene.layers.length, 1)
  const [controlsState, setControlsState] = useState<PreviewControlsState>(() =>
    buildInitialPreviewControlsState(sceneKey)
  )
  const normalizedState = normalizePreviewControlsState(controlsState, sceneKey)
  const safeActiveLayerIndex = clampLayerIndex(
    normalizedState.activeLayerIndex,
    layerCount
  )
  const activeLayer = scene.layers[safeActiveLayerIndex]
  const boxesInActiveLayer =
    activeLayer?.boxesInLayer ?? scene.placement.boxesPerLayer

  const setActiveLayerIndex = (nextLayerIndex: number) => {
    setControlsState((currentState) => {
      const current = normalizePreviewControlsState(currentState, sceneKey)
      return {
        ...current,
        activeLayerIndex: clampLayerIndex(nextLayerIndex, layerCount),
      }
    })
  }

  const setZoomPercent = (nextZoomPercent: number) => {
    setControlsState((currentState) => {
      const current = normalizePreviewControlsState(currentState, sceneKey)
      return {
        ...current,
        zoomPercent: nextZoomPercent,
      }
    })
  }

  return {
    layerCount,
    activeLayerIndex: safeActiveLayerIndex,
    activeLayer,
    boxesInActiveLayer,
    zoomPercent: normalizedState.zoomPercent,
    setActiveLayerIndex,
    setZoomPercent,
  }
}
