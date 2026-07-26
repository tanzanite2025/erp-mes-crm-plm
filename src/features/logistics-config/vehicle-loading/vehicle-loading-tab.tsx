'use client'

import { useCallback, useRef, useState } from 'react'
import { selectLatestVehicleModelTemplateForSeedVehicle } from '../vehicle-model-templates'
import { ConfigErrorPanel } from './components/config-error-panel'
import { VehicleFilterPanel } from './components/vehicle-filter-panel'
import { VehicleLoadingHeader } from './components/vehicle-loading-header'
import { VehicleLoadingPlanDialog } from './components/vehicle-loading-plan-dialog'
import { VehicleLoadingSummaryPanel } from './components/vehicle-loading-summary-panel'
import { VehicleRecommendationPanel } from './components/vehicle-recommendation-panel'
import type { VehicleLoadingPreviewScene } from './data/vehicle-loading-preview-scene.types'
import type { VehicleRecommendation } from './data/vehicle-loading.types'
import { useVehicleLoadingPage } from './hooks/use-vehicle-loading-page'
import { projectVehicleModelTemplateGeometryToLoadingSpace } from './services/vehicle-loading-geometry-projection'
import {
  buildCalculatingVehicleLoadingPreviewScene,
  buildEmptyVehicleLoadingPreviewScene,
  buildFailedVehicleLoadingPreviewScene,
} from './services/vehicle-loading-preview-scene'
import { calculateVehicleLoadingPlanWithWasm } from './services/vehicle-loading-wasm-engine'
import { buildVehicleLoadingPreviewSceneFromWasmPlan } from './services/vehicle-loading-wasm-plan-preview-scene'
import { buildVehicleLoadingPlanRequestFromMasterData } from './services/vehicle-loading-wasm-plan-request'

export function LogisticsVehicleLoadingTab() {
  const {
    summary,
    setBoxes,
    packageInput,
    packageInputError,
    packagingProfiles,
    packagingProfilesLoading,
    packagingProfilesError,
    selectedPackagingProfile,
    selectedPackagingProfileId,
    setSelectedPackagingProfileId,
    canCalculateRecommendations,
    category,
    setCategory,
    minVolumeM3,
    setMinVolumeM3,
    minPayloadKg,
    setMinPayloadKg,
    filteredSpecs,
    recommendations,
    activeFilters,
    isLoadingSpecs,
    isLoadingRecommendations,
    specsError,
    recommendationsError,
    modelTemplates,
    modelTemplatesError,
    reloadModelTemplates,
    reload,
  } = useVehicleLoadingPage()

  const [diagramOpen, setDiagramOpen] = useState(false)
  const previewRequestIdRef = useRef(0)
  const [previewScene, setPreviewScene] = useState<VehicleLoadingPreviewScene>(
    () => buildEmptyVehicleLoadingPreviewScene()
  )
  const [activePreviewRecommendation, setActivePreviewRecommendation] =
    useState<VehicleRecommendation | null>(null)

  const handleViewDiagram = useCallback(
    (recommendation: VehicleRecommendation) => {
      const previewRequestId = previewRequestIdRef.current + 1
      previewRequestIdRef.current = previewRequestId
      const vehicleName = recommendation.vehicle.name
      const modelTemplate = selectLatestVehicleModelTemplateForSeedVehicle(
        modelTemplates,
        recommendation.vehicle.id
      )

      setActivePreviewRecommendation(recommendation)
      setPreviewScene(buildCalculatingVehicleLoadingPreviewScene(vehicleName))
      setDiagramOpen(true)

      void (async () => {
        try {
          if (!packageInput) {
            throw new Error('包装规则主数据缺失，无法生成 WASM 装箱请求。')
          }

          const geometryProjection =
            await projectVehicleModelTemplateGeometryToLoadingSpace(
              modelTemplate
            )
          const request = buildVehicleLoadingPlanRequestFromMasterData({
            boxes: summary.boxes,
            vehicleSpec: recommendation.vehicle,
            packageInput,
            usableSpace: geometryProjection?.usableSpace,
            blockedSpaces: geometryProjection?.blockedSpaces,
          })
          const plan = await calculateVehicleLoadingPlanWithWasm(request)
          const scene = buildVehicleLoadingPreviewSceneFromWasmPlan({
            request,
            plan,
            vehicleName,
            vehicleSafetyAllowance: recommendation.vehicle.safetyAllowance,
            vehicleLoadingConstraint: recommendation.vehicle.loadingConstraint,
            modelTemplate,
            modelTemplateSource: modelTemplate
              ? 'registered-template'
              : 'seed-vehicle-fallback',
            geometryProjection,
          })

          if (previewRequestIdRef.current !== previewRequestId) return
          setPreviewScene(scene)
        } catch (error) {
          if (previewRequestIdRef.current !== previewRequestId) return
          setPreviewScene(
            buildFailedVehicleLoadingPreviewScene({
              vehicleName,
              errorMessage:
                error instanceof Error ? error.message : String(error),
            })
          )
        }
      })()
    },
    [modelTemplates, packageInput, summary.boxes]
  )

  const handleOpenDiagramWithoutRecommendation = useCallback(() => {
    previewRequestIdRef.current += 1
    setActivePreviewRecommendation(null)
    setPreviewScene(buildEmptyVehicleLoadingPreviewScene())
    setDiagramOpen(true)
  }, [])

  const handleRetryDiagramCalculation = useCallback(() => {
    if (!activePreviewRecommendation) return
    handleViewDiagram(activePreviewRecommendation)
  }, [activePreviewRecommendation, handleViewDiagram])

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <VehicleLoadingHeader
        onViewDiagram={() => {
          const fallback = recommendations[0]
          if (fallback) {
            handleViewDiagram(fallback)
            return
          }
          handleOpenDiagramWithoutRecommendation()
        }}
      />

      <VehicleLoadingSummaryPanel
        summary={summary}
        packageInput={packageInput}
        packageInputError={packageInputError}
        packagingProfiles={packagingProfiles}
        packagingProfilesLoading={packagingProfilesLoading}
        packagingProfilesError={packagingProfilesError}
        selectedPackagingProfile={selectedPackagingProfile}
        selectedPackagingProfileId={selectedPackagingProfileId}
        onSelectedPackagingProfileIdChange={setSelectedPackagingProfileId}
        onBoxesChange={setBoxes}
      />

      <div className='flex flex-col gap-6'>
        <VehicleFilterPanel
          category={category}
          minVolumeM3={minVolumeM3}
          minPayloadKg={minPayloadKg}
          activeFilters={activeFilters}
          vehicleSpecsCount={filteredSpecs.length}
          isLoadingSpecs={isLoadingSpecs}
          onCategoryChange={setCategory}
          onMinVolumeM3Change={setMinVolumeM3}
          onMinPayloadKgChange={setMinPayloadKg}
        />

        {specsError ? (
          <ConfigErrorPanel
            title='车型加载失败'
            error={specsError}
            retryLabel='重新加载车型'
            onRetry={reload}
          />
        ) : null}
        {!specsError && isLoadingSpecs ? (
          <div className='rounded-[28px] border border-dashed bg-background/80 px-6 py-8 text-sm font-black shadow-none'>
            车型加载中...
          </div>
        ) : null}
        {modelTemplatesError ? (
          <ConfigErrorPanel
            title='模型模板读取失败'
            error={
              new Error(
                `${modelTemplatesError.message}。装箱预览会暂时回退到车型规格库种子定义，不会影响推荐计算。`
              )
            }
            retryLabel='重新读取模板'
            className='rounded-[22px]'
            onRetry={() => {
              void reloadModelTemplates()
            }}
          />
        ) : null}

        {recommendationsError ? (
          <ConfigErrorPanel
            title='推荐计算失败'
            error={recommendationsError}
            retryLabel='重新计算推荐'
            className='rounded-[22px]'
            onRetry={reload}
          />
        ) : null}
        {!recommendationsError && isLoadingRecommendations ? (
          <div className='rounded-[22px] border border-dashed bg-primary/5 px-5 py-4 text-[10px] font-black tracking-widest text-primary/70 uppercase shadow-none'>
            推荐计算中...
          </div>
        ) : null}
        {!recommendationsError &&
        !isLoadingRecommendations &&
        !canCalculateRecommendations ? (
          <div className='rounded-[22px] border border-dashed border-amber-500/30 bg-amber-500/5 px-5 py-4 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300'>
            请先选择包装管理中的包装规则，并录入有效的箱数、总体积、总毛重；未满足条件时页面不会生成配车推荐。
          </div>
        ) : null}
        {!recommendationsError &&
        !isLoadingRecommendations &&
        canCalculateRecommendations ? (
          <VehicleRecommendationPanel
            recommendations={recommendations}
            onViewDiagram={handleViewDiagram}
          />
        ) : null}
      </div>

      <VehicleLoadingPlanDialog
        open={diagramOpen}
        onOpenChange={setDiagramOpen}
        scene={previewScene}
        onRetryCalculation={handleRetryDiagramCalculation}
      />
    </div>
  )
}
