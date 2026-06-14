import { useMemo } from 'react'
import { useLanguage } from '@/context/language-provider'
import {
  getVehicleLoadingSourceConfig,
  type VehicleLoadingSourceType,
} from '../data/vehicle-loading-sources'
import { categoryLabelKey } from '../data/vehicle-loading.utils'
import { useVehicleLoadingData } from './use-vehicle-loading-data'
import { useVehicleLoadingSourcePackageInput } from './use-vehicle-loading-source-package-input'
import { useVehicleLoadingState } from './use-vehicle-loading-state'

export type VehicleLoadingSource = VehicleLoadingSourceType

export function useVehicleLoadingPage() {
  const { t } = useLanguage()
  const state = useVehicleLoadingState()
  const sourceConfig = useMemo(
    () => getVehicleLoadingSourceConfig(state.source),
    [state.source]
  )
  const packageInputState = useVehicleLoadingSourcePackageInput({
    source: state.source,
    summary: state.summary,
    selectedPackagingProfileId: state.selectedPackagingProfileId,
    apiPackageDraft: state.apiPackageDraft,
    sourceLabel: sourceConfig.label,
  })
  const data = useVehicleLoadingData(
    state.summary,
    state.source,
    packageInputState.packageInput,
    packageInputState.isPackageInputReady
  )

  const categoryOptions = useMemo(
    () => [
      { value: 'all' as const, label: '全部' },
      { value: 'van' as const, label: t(categoryLabelKey('van')) },
      { value: 'boxTruck' as const, label: t(categoryLabelKey('boxTruck')) },
      {
        value: 'lightTruck' as const,
        label: t(categoryLabelKey('lightTruck')),
      },
      {
        value: 'mediumTruck' as const,
        label: t(categoryLabelKey('mediumTruck')),
      },
    ],
    [t]
  )

  const filteredSpecs = useMemo(() => {
    const volumeMin = Number(state.minVolumeM3)
    const payloadMin = Number(state.minPayloadKg)

    return data.vehicleSpecs.filter((spec) => {
      if (state.category !== 'all' && spec.category !== state.category)
        return false
      if (
        Number.isFinite(volumeMin) &&
        state.minVolumeM3.trim() !== '' &&
        spec.volumeM3 < volumeMin
      )
        return false
      if (
        Number.isFinite(payloadMin) &&
        state.minPayloadKg.trim() !== '' &&
        spec.payloadKg < payloadMin
      )
        return false
      return true
    })
  }, [data.vehicleSpecs, state.category, state.minPayloadKg, state.minVolumeM3])

  const activeFilters = useMemo(() => {
    const items: Array<{ label: string; value: string }> = [
      {
        label: '类别',
        value:
          categoryOptions.find((item) => item.value === state.category)
            ?.label ?? '全部',
      },
    ]
    if (state.minVolumeM3.trim() !== '')
      items.push({ label: '最小体积', value: `${state.minVolumeM3} m³` })
    if (state.minPayloadKg.trim() !== '')
      items.push({ label: '最小载重', value: `${state.minPayloadKg} kg` })
    items.push({ label: '来源', value: sourceConfig.label })
    return items
  }, [
    categoryOptions,
    sourceConfig.label,
    state.category,
    state.minPayloadKg,
    state.minVolumeM3,
  ])

  return {
    summary: state.summary,
    setSummary: state.setSummary,
    source: state.source,
    setSource: state.setSource,
    packageInput: packageInputState.packageInput,
    packageInputError: packageInputState.packageInputError,
    isLoadingPackageInput: packageInputState.isLoadingPackageInput,
    packagingProfiles: packageInputState.packagingProfiles,
    selectedPackagingProfileId: packageInputState.resolvedPackagingProfileId,
    setSelectedPackagingProfileId: state.setSelectedPackagingProfileId,
    apiPackageDraft: state.apiPackageDraft,
    setApiPackageDraft: state.setApiPackageDraft,
    category: state.category,
    setCategory: state.setCategory,
    minVolumeM3: state.minVolumeM3,
    setMinVolumeM3: state.setMinVolumeM3,
    minPayloadKg: state.minPayloadKg,
    setMinPayloadKg: state.setMinPayloadKg,
    filteredSpecs,
    recommendations: data.recommendations,
    categoryOptions,
    activeFilters,
    sourceLabel: sourceConfig.label,
    isLoadingSpecs: data.isLoadingSpecs,
    isLoadingRecommendations: data.isLoadingRecommendations,
    specsError: data.specsError,
    recommendationsError: data.recommendationsError,
    reload: data.reload,
  }
}
