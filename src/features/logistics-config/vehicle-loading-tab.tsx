'use client'

import { useMemo, useState } from 'react'
import { ConfigErrorPanel } from './vehicle-loading/components/config-error-panel'
import { VehicleFilterPanel } from './vehicle-loading/components/vehicle-filter-panel'
import { VehicleLoadingHeader } from './vehicle-loading/components/vehicle-loading-header'
import { VehicleLoadingPlanDialog } from './vehicle-loading/components/vehicle-loading-plan-dialog'
import { VehicleLoadingPlanOverview } from './vehicle-loading/components/vehicle-loading-plan-overview'
import { VehicleLoadingSourceSwitch } from './vehicle-loading/components/vehicle-loading-source-switch'
import { VehicleLoadingSummaryPanel } from './vehicle-loading/components/vehicle-loading-summary-panel'
import { VehiclePhotoDialog } from './vehicle-loading/components/vehicle-photo-dialog'
import { VehicleRecommendationPanel } from './vehicle-loading/components/vehicle-recommendation-panel'
import { VehicleSpecsTable } from './vehicle-loading/components/vehicle-specs-table'
import type { VehicleRecommendation } from './vehicle-loading/data/vehicle-loading.types'
import { useVehicleLoadingPage } from './vehicle-loading/hooks/use-vehicle-loading-page'
import { useVehiclePhotoDialogState } from './vehicle-loading/hooks/use-vehicle-photo-dialog-state'

export function LogisticsVehicleLoadingTab() {
  const {
    summary,
    setSummary,
    source,
    setSource,
    category,
    setCategory,
    minVolumeM3,
    setMinVolumeM3,
    minPayloadKg,
    setMinPayloadKg,
    filteredSpecs,
    recommendations,
    categoryOptions,
    sourceLabel,
    activeFilters,
    isLoadingSpecs,
    isLoadingRecommendations,
    specsError,
    recommendationsError,
    reload,
  } = useVehicleLoadingPage()

  const [diagramOpen, setDiagramOpen] = useState(false)
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<VehicleRecommendation | null>(null)
  const {
    photoDialogOpen,
    setPhotoDialogOpen,
    selectedVehicle,
    selectedPhotoEntry,
    openVehiclePhotos,
  } = useVehiclePhotoDialogState()

  const selectedSpec = useMemo(() => filteredSpecs[0] ?? null, [filteredSpecs])

  const handleViewDiagram = (recommendation: VehicleRecommendation) => {
    setSelectedRecommendation(recommendation)
    setDiagramOpen(true)
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <VehicleLoadingHeader onViewDiagram={() => setDiagramOpen(true)} />

      <VehicleLoadingSourceSwitch value={source} onChange={setSource} />

      {source === 'packing-rule' ? (
        <div className='rounded-[28px] border border-dashed border-primary/30 bg-primary/5 px-6 py-5 text-[11px] leading-relaxed text-primary/80 shadow-none'>
          当前切换到包装规则结果来源。这里后续会接入
          `/logistics-config/packaging-rules` 的动态装箱结果，
          现在先保留为占位提示，方便你在页面上直接感知来源变化。
        </div>
      ) : null}

      {source === 'api' ? (
        <div className='rounded-[28px] border border-dashed border-primary/30 bg-primary/5 px-6 py-5 text-[11px] leading-relaxed text-primary/80 shadow-none'>
          当前切换到 API
          结果来源。后续这里会直接读取后端返回的装箱与配车方案，当前仍使用本地默认适配器。
        </div>
      ) : null}

      <VehicleLoadingPlanOverview
        summary={summary}
        vehicleSpecsCount={filteredSpecs.length}
        recommendations={recommendations}
        categoryLabelText={
          categoryOptions.find(
            (item: { value: string; label: string }) => item.value === category
          )?.label ?? '全部'
        }
        sourceLabel={sourceLabel}
        activeFilters={activeFilters}
        isLoadingSpecs={isLoadingSpecs}
        isLoadingRecommendations={isLoadingRecommendations}
        specsError={specsError}
        recommendationsError={recommendationsError}
      />

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
        <VehicleLoadingSummaryPanel
          summary={summary}
          onSummaryChange={setSummary}
        />

        <div className='flex flex-col gap-6 xl:col-span-2'>
          <VehicleFilterPanel
            category={category}
            minVolumeM3={minVolumeM3}
            minPayloadKg={minPayloadKg}
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
          {!specsError && !isLoadingSpecs ? (
            <VehicleSpecsTable
              specs={filteredSpecs}
              onViewPhoto={openVehiclePhotos}
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
          {!recommendationsError && !isLoadingRecommendations ? (
            <VehicleRecommendationPanel
              recommendations={recommendations}
              onViewDiagram={handleViewDiagram}
              onViewPhoto={openVehiclePhotos}
            />
          ) : null}
        </div>
      </div>

      <VehicleLoadingPlanDialog
        open={diagramOpen}
        onOpenChange={setDiagramOpen}
        vehicleName={selectedRecommendation?.vehicle.name ?? '装载示意'}
        vehicleSize={{
          lengthMm:
            selectedRecommendation?.vehicle.usableInnerSize.lengthMm ?? 0,
          widthMm: selectedRecommendation?.vehicle.usableInnerSize.widthMm ?? 0,
          heightMm:
            selectedRecommendation?.vehicle.usableInnerSize.heightMm ?? 0,
        }}
        packageSize={{
          lengthMm: selectedSpec?.usableInnerSize.lengthMm ?? 0,
          widthMm: selectedSpec?.usableInnerSize.widthMm ?? 0,
          heightMm: selectedSpec?.usableInnerSize.heightMm ?? 0,
        }}
        orientationLabel={
          selectedRecommendation?.selectedOrientationLabel ?? '当前推荐方案'
        }
        orientationAxis={selectedRecommendation?.selectedOrientationAxis}
        boxesPerLayer={selectedRecommendation?.boxesPerLayer ?? 3}
        layerCount={selectedRecommendation?.layerCount ?? 2}
        maxBoxes={selectedRecommendation?.maxBoxesPerVehicle ?? 6}
        explanation={
          selectedRecommendation
            ? [
                selectedRecommendation.reason,
                selectedRecommendation.warning ?? '当前方案可直接查看示意图',
                selectedRecommendation.selectedOrientationLabel
                  ? `推荐朝向：${selectedRecommendation.selectedOrientationLabel}`
                  : '暂无朝向信息',
              ]
            : ['请选择一个推荐方案查看装载示意。']
        }
      />

      <VehiclePhotoDialog
        open={photoDialogOpen}
        onOpenChange={setPhotoDialogOpen}
        vehicle={selectedVehicle}
        photoEntry={selectedPhotoEntry}
      />
    </div>
  )
}
