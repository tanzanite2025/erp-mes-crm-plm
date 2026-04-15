'use client'

import { useMemo, useState } from 'react'
import { ConfigErrorPanel } from './components/config-error-panel'
import { VehicleFilterPanel } from './components/vehicle-filter-panel'
import { VehicleLoadingHeader } from './components/vehicle-loading-header'
import { VehicleLoadingPlanDialog } from './components/vehicle-loading-plan-dialog'
import { VehicleLoadingPlanOverview } from './components/vehicle-loading-plan-overview'
import { VehicleLoadingSourceInputPanel } from './components/vehicle-loading-source-input-panel'
import { VehicleLoadingSourceSwitch } from './components/vehicle-loading-source-switch'
import { VehicleLoadingSummaryPanel } from './components/vehicle-loading-summary-panel'
import { VehicleRecommendationPanel } from './components/vehicle-recommendation-panel'
import { useVehicleLoadingPage } from './hooks/use-vehicle-loading-page'
import type { VehicleRecommendation } from './data/vehicle-loading.types'
import type { VehicleSize } from './components/vehicle-loading-diagram-types'

export function LogisticsVehicleLoadingTab() {
  const {
    summary,
    setSummary,
    source,
    setSource,
    packageInput,
    packageInputError,
    isLoadingPackageInput,
    packagingProfiles,
    selectedPackagingProfileId,
    setSelectedPackagingProfileId,
    apiPackageDraft,
    setApiPackageDraft,
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
  const [selectedRecommendation, setSelectedRecommendation] = useState<VehicleRecommendation | null>(null)

  const selectedVehicleSize = useMemo<VehicleSize>(
    () => ({
      lengthMm: selectedRecommendation?.vehicle.usableInnerSize.lengthMm ?? 0,
      widthMm: selectedRecommendation?.vehicle.usableInnerSize.widthMm ?? 0,
      heightMm: selectedRecommendation?.vehicle.usableInnerSize.heightMm ?? 0,
    }),
    [selectedRecommendation]
  )

  const selectedPackageSize = useMemo<VehicleSize>(
    () => ({
      lengthMm: selectedRecommendation?.packageDimension.lengthMm ?? 0,
      widthMm: selectedRecommendation?.packageDimension.widthMm ?? 0,
      heightMm: selectedRecommendation?.packageDimension.heightMm ?? 0,
    }),
    [selectedRecommendation]
  )

  const handleViewDiagram = (recommendation: VehicleRecommendation) => {
    setSelectedRecommendation(recommendation)
    setDiagramOpen(true)
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <VehicleLoadingHeader
        onViewDiagram={() => {
          const fallback = recommendations[0]
          if (fallback) {
            handleViewDiagram(fallback)
            return
          }
          setSelectedRecommendation(null)
          setDiagramOpen(true)
        }}
      />

      <VehicleLoadingSourceSwitch value={source} onChange={setSource} />

      {source === 'packing-rule' ? (
        <div className='rounded-[28px] border border-dashed border-primary/30 bg-primary/5 shadow-none px-6 py-5 text-[11px] leading-relaxed text-primary/80'>
          当前切换到包装规则来源。页面会读取活动包装定义，并将其尺寸与单箱重量映射为推荐输入；
          当前箱数仍以本页 summary 为准，尚未扩大到动态装箱计划 authority。
        </div>
      ) : null}

      {source === 'api' ? (
        <div className='rounded-[28px] border border-dashed border-primary/30 bg-primary/5 shadow-none px-6 py-5 text-[11px] leading-relaxed text-primary/80'>
          当前切换到 API 输入来源。推荐计算会通过统一后端接口执行，
          并直接使用你在下方填写的显式箱型参数，不再回落默认箱型冒充真实来源。
        </div>
      ) : null}

      <VehicleLoadingSourceInputPanel
        source={source}
        packageInput={packageInput}
        packageInputError={packageInputError}
        isLoadingPackageInput={isLoadingPackageInput}
        packagingProfiles={packagingProfiles}
        selectedPackagingProfileId={selectedPackagingProfileId}
        onSelectedPackagingProfileIdChange={setSelectedPackagingProfileId}
        apiPackageDraft={apiPackageDraft}
        onApiPackageDraftChange={setApiPackageDraft}
      />

      <VehicleLoadingPlanOverview
        summary={summary}
        vehicleSpecsCount={filteredSpecs.length}
        recommendations={recommendations}
        categoryLabelText={categoryOptions.find((item) => item.value === category)?.label ?? '全部'}
        sourceLabel={sourceLabel}
        activeFilters={activeFilters}
        isLoadingSpecs={isLoadingSpecs}
        isLoadingRecommendations={isLoadingRecommendations}
        specsError={specsError}
        recommendationsError={recommendationsError}
      />

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
        <VehicleLoadingSummaryPanel summary={summary} onSummaryChange={setSummary} />

        <div className='flex flex-col gap-6 xl:col-span-2'>
          <VehicleFilterPanel
            category={category}
            minVolumeM3={minVolumeM3}
            minPayloadKg={minPayloadKg}
            onCategoryChange={setCategory}
            onMinVolumeM3Change={setMinVolumeM3}
            onMinPayloadKgChange={setMinPayloadKg}
          />

          {specsError ? <ConfigErrorPanel title='车型加载失败' error={specsError} retryLabel='重新加载车型' onRetry={reload} /> : null}
          {!specsError && isLoadingSpecs ? (
            <div className='rounded-[28px] border border-dashed shadow-none bg-background/80 px-6 py-8 text-sm font-black'>
              车型加载中...
            </div>
          ) : null}
          {!specsError && !isLoadingSpecs ? (
            <div className='rounded-[24px] border border-dashed border-primary/20 bg-primary/5 px-5 py-4 text-sm leading-relaxed text-primary/80'>
              当前页面只承载装载/配车计算。车型主数据已独立到“车型规格库”TAB，当前筛选条件会直接作用于推荐试算。
            </div>
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
            <div className='rounded-[22px] border border-dashed shadow-none bg-primary/5 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-primary/70'>
              推荐计算中...
            </div>
          ) : null}
          {!recommendationsError && !isLoadingRecommendations ? (
            <VehicleRecommendationPanel recommendations={recommendations} onViewDiagram={handleViewDiagram} />
          ) : null}
        </div>
      </div>

      <VehicleLoadingPlanDialog
        open={diagramOpen}
        onOpenChange={setDiagramOpen}
        vehicleName={selectedRecommendation?.vehicle.name ?? '装载示意'}
        vehicleSize={selectedVehicleSize}
        packageSize={selectedPackageSize}
        orientationLabel={selectedRecommendation?.selectedOrientationLabel ?? '当前推荐方案'}
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
    </div>
  )
}
