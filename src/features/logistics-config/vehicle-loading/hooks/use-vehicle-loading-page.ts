import { useMemo } from 'react'
import { categoryLabel } from '../data/vehicle-loading.utils'
import { getVehicleLoadingSourceConfig, type VehicleLoadingSourceType } from '../data/vehicle-loading-sources'
import { useVehicleLoadingData } from './use-vehicle-loading-data'
import { useVehicleLoadingState } from './use-vehicle-loading-state'

export type VehicleLoadingSource = VehicleLoadingSourceType

export function useVehicleLoadingPage() {
  const state = useVehicleLoadingState()
  const data = useVehicleLoadingData(state.summary, state.source)
  const sourceConfig = useMemo(() => getVehicleLoadingSourceConfig(state.source), [state.source])

  const categoryOptions = useMemo(
    () => [
      { value: 'all' as const, label: '全部' },
      { value: 'van' as const, label: categoryLabel('van') },
      { value: 'boxTruck' as const, label: categoryLabel('boxTruck') },
      { value: 'lightTruck' as const, label: categoryLabel('lightTruck') },
      { value: 'mediumTruck' as const, label: categoryLabel('mediumTruck') },
    ],
    []
  )

  const filteredSpecs = useMemo(() => {
    const volumeMin = Number(state.minVolumeM3)
    const payloadMin = Number(state.minPayloadKg)

    return data.vehicleSpecs.filter((spec) => {
      if (state.category !== 'all' && spec.category !== state.category) return false
      if (Number.isFinite(volumeMin) && state.minVolumeM3.trim() !== '' && spec.volumeM3 < volumeMin) return false
      if (Number.isFinite(payloadMin) && state.minPayloadKg.trim() !== '' && spec.payloadKg < payloadMin) return false
      return true
    })
  }, [data.vehicleSpecs, state.category, state.minPayloadKg, state.minVolumeM3])

  const activeFilters = useMemo(() => {
    const items: Array<{ label: string; value: string }> = [{ label: '类别', value: categoryOptions.find((item) => item.value === state.category)?.label ?? '全部' }]
    if (state.minVolumeM3.trim() !== '') items.push({ label: '最小体积', value: `${state.minVolumeM3} m³` })
    if (state.minPayloadKg.trim() !== '') items.push({ label: '最小载重', value: `${state.minPayloadKg} kg` })
    items.push({ label: '来源', value: sourceConfig.label })
    return items
  }, [categoryOptions, sourceConfig.label, state.category, state.minPayloadKg, state.minVolumeM3])

  return {
    summary: state.summary,
    setSummary: state.setSummary,
    source: state.source,
    setSource: state.setSource,
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
