import { useCallback, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import {
  packagingRulesService,
  type PackagingProfile,
} from '@/features/logistics-packaging-management/packaging-rules-service'
import { packagingManagementQueryKeys } from '@/features/logistics-packaging-management/query-keys'
import { categoryLabelKey } from '../../vehicle-specs/data/vehicle-specs.utils'
import type { VehicleSpec } from '../../vehicle-specs/data/vehicle-specs.types'
import type { VehicleLoadingPackageInput } from '../data/vehicle-loading.types'
import { buildVehicleLoadingPackageInputFromProfile } from '../services/vehicle-loading-package-input'
import { buildVehicleLoadingSummaryFromPackageInput } from '../services/vehicle-loading-summary'
import { useVehicleLoadingData } from './use-vehicle-loading-data'
import { useVehicleLoadingState } from './use-vehicle-loading-state'
import { useVehicleModelTemplateRegistry } from '../../vehicle-model-templates/hooks/use-vehicle-model-template-registry'

function isShipmentSummaryReady(summary: {
  boxes: number
  totalVolumeM3: number
  totalWeightKg: number
}) {
  return (
    Number.isFinite(summary.boxes) &&
    summary.boxes > 0 &&
    Number.isFinite(summary.totalVolumeM3) &&
    summary.totalVolumeM3 > 0 &&
    Number.isFinite(summary.totalWeightKg) &&
    summary.totalWeightKg > 0
  )
}

export function useVehicleLoadingPage() {
  const { t } = useLanguage()
  const state = useVehicleLoadingState()
  const packagingProfilesQuery = useQuery({
    queryKey: packagingManagementQueryKeys.profiles(),
    queryFn: () => packagingRulesService.getProfiles(),
  })
  const modelTemplatesQuery = useVehicleModelTemplateRegistry(undefined, {
    enabled: true,
  })
  const {
    selectedPackagingProfileId,
    setSelectedPackagingProfileId,
  } = state
  const activePackagingProfiles = useMemo(
    () =>
      (packagingProfilesQuery.data ?? []).filter((profile) => profile.isActive),
    [packagingProfilesQuery.data]
  )
  const selectedPackagingProfile = useMemo<PackagingProfile | null>(
    () =>
      activePackagingProfiles.find(
        (profile) => profile.id === selectedPackagingProfileId
      ) ?? null,
    [activePackagingProfiles, selectedPackagingProfileId]
  )

  useEffect(() => {
    if (packagingProfilesQuery.isLoading || !selectedPackagingProfileId) {
      return
    }
    if (!selectedPackagingProfile) {
      setSelectedPackagingProfileId('')
    }
  }, [
    packagingProfilesQuery.isLoading,
    selectedPackagingProfile,
    selectedPackagingProfileId,
    setSelectedPackagingProfileId,
  ])

  const packageInputState = useMemo<{
    packageInput: VehicleLoadingPackageInput | null
    packageInputError: Error | null
    isPackageInputReady: boolean
  }>(() => {
    if (!selectedPackagingProfile) {
      return {
        packageInput: null,
        packageInputError: null,
        isPackageInputReady: false,
      }
    }
    try {
      return {
        packageInput: buildVehicleLoadingPackageInputFromProfile(
          selectedPackagingProfile
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
  }, [selectedPackagingProfile])
  const summary = useMemo(
    () =>
      buildVehicleLoadingSummaryFromPackageInput(
        state.boxes,
        packageInputState.packageInput
      ),
    [packageInputState.packageInput, state.boxes]
  )
  const summaryReady = isShipmentSummaryReady(summary)
  const filterVehicleSpec = useCallback(
    (spec: VehicleSpec) => {
      const volumeMin = Number(state.minVolumeM3)
      const payloadMin = Number(state.minPayloadKg)

      if (state.category !== 'all' && spec.category !== state.category) {
        return false
      }
      if (
        Number.isFinite(volumeMin) &&
        state.minVolumeM3.trim() !== '' &&
        spec.volumeM3 < volumeMin
      ) {
        return false
      }
      if (
        Number.isFinite(payloadMin) &&
        state.minPayloadKg.trim() !== '' &&
        spec.payloadKg < payloadMin
      ) {
        return false
      }
      return true
    },
    [state.category, state.minPayloadKg, state.minVolumeM3]
  )
  const data = useVehicleLoadingData(
    summary,
    packageInputState.packageInput,
    packageInputState.isPackageInputReady && summaryReady,
    filterVehicleSpec
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
    return data.vehicleSpecs.filter(filterVehicleSpec)
  }, [data.vehicleSpecs, filterVehicleSpec])

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
    summary,
    boxes: state.boxes,
    setBoxes: state.setBoxes,
    summaryReady,
    packageInput: packageInputState.packageInput,
    packageInputError: packageInputState.packageInputError,
    packagingProfiles: activePackagingProfiles,
    packagingProfilesLoading: packagingProfilesQuery.isLoading,
    packagingProfilesError:
      packagingProfilesQuery.error instanceof Error
        ? packagingProfilesQuery.error
        : packagingProfilesQuery.error
          ? new Error('包装规则加载失败')
          : null,
    selectedPackagingProfile,
    selectedPackagingProfileId,
    setSelectedPackagingProfileId,
    canCalculateRecommendations:
      packageInputState.isPackageInputReady && summaryReady,
    category: state.category,
    setCategory: state.setCategory,
    minVolumeM3: state.minVolumeM3,
    setMinVolumeM3: state.setMinVolumeM3,
    minPayloadKg: state.minPayloadKg,
    setMinPayloadKg: state.setMinPayloadKg,
    filteredSpecs,
    recommendations: data.recommendations,
    activeFilters,
    isLoadingSpecs: data.isLoadingSpecs,
    isLoadingRecommendations: data.isLoadingRecommendations,
    specsError: data.specsError,
    recommendationsError: data.recommendationsError,
    modelTemplates: modelTemplatesQuery.templates,
    modelTemplatesLoading: modelTemplatesQuery.isLoadingTemplates,
    modelTemplatesError:
      modelTemplatesQuery.templatesError instanceof Error
        ? modelTemplatesQuery.templatesError
        : modelTemplatesQuery.templatesError
          ? new Error('车型模型模板读取失败')
          : null,
    reloadModelTemplates: modelTemplatesQuery.reloadTemplates,
    reload: data.reload,
  }
}
