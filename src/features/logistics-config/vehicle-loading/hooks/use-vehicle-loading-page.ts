import { useMemo } from 'react'
import { useLanguage } from '@/context/language-provider'
import { categoryLabelKey } from '../../vehicle-specs/data/vehicle-specs.utils'
import type { VehicleLoadingPackageInput } from '../data/vehicle-loading.types'
import { buildVehicleLoadingPackageInputFromDraft } from '../services/vehicle-loading-package-input'
import { useVehicleLoadingData } from './use-vehicle-loading-data'
import { useVehicleLoadingState } from './use-vehicle-loading-state'

export function useVehicleLoadingPage() {
  const { t } = useLanguage()
  const state = useVehicleLoadingState()
  const packageInputState = useMemo<{
    packageInput: VehicleLoadingPackageInput | null
    packageInputError: Error | null
    isPackageInputReady: boolean
  }>(() => {
    try {
      return {
        packageInput: buildVehicleLoadingPackageInputFromDraft(
          state.packageDraft,
          state.summary
        ),
        packageInputError: null,
        isPackageInputReady: true,
      }
    } catch (error) {
      return {
        packageInput: null,
        packageInputError:
          error instanceof Error
            ? error
            : new Error('Failed to build vehicle loading package input'),
        isPackageInputReady: false,
      }
    }
  }, [state.packageDraft, state.summary])
  const data = useVehicleLoadingData(
    state.summary,
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
    return items
  }, [categoryOptions, state.category, state.minPayloadKg, state.minVolumeM3])

  return {
    summary: state.summary,
    setSummary: state.setSummary,
    packageInput: packageInputState.packageInput,
    packageInputError: packageInputState.packageInputError,
    packageDraft: state.packageDraft,
    setPackageDraft: state.setPackageDraft,
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
    isLoadingSpecs: data.isLoadingSpecs,
    isLoadingRecommendations: data.isLoadingRecommendations,
    specsError: data.specsError,
    recommendationsError: data.recommendationsError,
    reload: data.reload,
  }
}
