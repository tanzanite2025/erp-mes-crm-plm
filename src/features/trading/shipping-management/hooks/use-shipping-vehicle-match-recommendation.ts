import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import { packagingRulesService, type PackagingProfile } from '@/features/logistics-config/packaging-rules-service'
import type { ShipmentSummary } from '@/features/logistics-config/vehicle-loading/data/vehicle-loading.types'
import { getVehicleLoadingSourceConfig, type VehicleLoadingSourceType } from '@/features/logistics-config/vehicle-loading/data/vehicle-loading-sources'
import { useVehicleLoadingData } from '@/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-data'
import {
  buildManualVehicleLoadingPackageInput,
  buildVehicleLoadingPackageInputFromProfile,
} from '@/features/logistics-config/vehicle-loading/services/vehicle-loading-package-input'
import type { ShippingVehicleMatchItem } from '../types'

const SHIPPING_MATCH_PACKAGING_PROFILE_QUERY_KEY = ['logistics-config', 'packaging-profiles'] as const

function buildManualPackageInputState(summary: ShipmentSummary) {
  try {
    return {
      packageInput: buildManualVehicleLoadingPackageInput(summary, getVehicleLoadingSourceConfig('manual').label),
      error: null,
      ready: true,
    }
  } catch (error) {
    return {
      packageInput: null,
      error: error instanceof Error ? error : new Error('无法构造手动试算包装输入'),
      ready: false,
    }
  }
}

function buildPackingRulePackageInputState(profile: PackagingProfile | null) {
  if (!profile) {
    return {
      packageInput: null,
      error: null,
      ready: false,
    }
  }

  try {
    return {
      packageInput: buildVehicleLoadingPackageInputFromProfile(profile, getVehicleLoadingSourceConfig('packing-rule').label),
      error: null,
      ready: true,
    }
  } catch (error) {
    return {
      packageInput: null,
      error: error instanceof Error ? error : new Error('无法构造包装规则输入'),
      ready: false,
    }
  }
}

export function useShippingVehicleMatchRecommendation(item: ShippingVehicleMatchItem, summary: ShipmentSummary) {
  const hasPreferredPackagingProfile = item.packageProfileId.trim() !== ''
  const { isLoading: isLoadingUnits, error: unitsError, refetch: refetchUnits } = useUnitsQuery({
    enabled: hasPreferredPackagingProfile,
  })
  const profilesQuery = useQuery({
    queryKey: SHIPPING_MATCH_PACKAGING_PROFILE_QUERY_KEY,
    queryFn: () => packagingRulesService.getProfiles(),
    enabled: hasPreferredPackagingProfile,
    retry: false,
  })
  const {
    data: profilesData,
    error: profilesError,
    isLoading: isLoadingProfiles,
    refetch: refetchProfiles,
  } = profilesQuery

  const activeProfiles = useMemo(() => (profilesData ?? []).filter((profile) => profile.isActive), [profilesData])
  const selectedPackagingProfile = useMemo(
    () => activeProfiles.find((profile) => profile.id === item.packageProfileId) ?? null,
    [activeProfiles, item.packageProfileId]
  )

  const manualPackageState = useMemo(() => buildManualPackageInputState(summary), [summary])
  const packingRulePackageState = useMemo(() => buildPackingRulePackageInputState(selectedPackagingProfile), [selectedPackagingProfile])

  const packageResolution = useMemo(() => {
    if (!hasPreferredPackagingProfile) {
      return {
        source: 'manual' as VehicleLoadingSourceType,
        sourceLabel: getVehicleLoadingSourceConfig('manual').label,
        packageInput: manualPackageState.packageInput,
        packageInputError: manualPackageState.error,
        isReady: manualPackageState.ready,
        isLoading: false,
        notice: null as string | null,
      }
    }

    if (unitsError instanceof Error) {
      return {
        source: 'packing-rule' as VehicleLoadingSourceType,
        sourceLabel: getVehicleLoadingSourceConfig('packing-rule').label,
        packageInput: null,
        packageInputError: unitsError,
        isReady: false,
        isLoading: false,
        notice: null as string | null,
      }
    }

    if (profilesError instanceof Error) {
      return {
        source: 'packing-rule' as VehicleLoadingSourceType,
        sourceLabel: getVehicleLoadingSourceConfig('packing-rule').label,
        packageInput: null,
        packageInputError: profilesError,
        isReady: false,
        isLoading: false,
        notice: null as string | null,
      }
    }

    if (isLoadingProfiles || isLoadingUnits) {
      return {
        source: 'packing-rule' as VehicleLoadingSourceType,
        sourceLabel: getVehicleLoadingSourceConfig('packing-rule').label,
        packageInput: null,
        packageInputError: null,
        isReady: false,
        isLoading: true,
        notice: null as string | null,
      }
    }

    if (selectedPackagingProfile && packingRulePackageState.ready) {
      return {
        source: 'packing-rule' as VehicleLoadingSourceType,
        sourceLabel: getVehicleLoadingSourceConfig('packing-rule').label,
        packageInput: packingRulePackageState.packageInput,
        packageInputError: null,
        isReady: true,
        isLoading: false,
        notice: null as string | null,
      }
    }

    if (packingRulePackageState.error instanceof Error) {
      return {
        source: 'packing-rule' as VehicleLoadingSourceType,
        sourceLabel: getVehicleLoadingSourceConfig('packing-rule').label,
        packageInput: null,
        packageInputError: packingRulePackageState.error,
        isReady: false,
        isLoading: false,
        notice: null as string | null,
      }
    }

    if (manualPackageState.ready) {
      return {
        source: 'manual' as VehicleLoadingSourceType,
        sourceLabel: getVehicleLoadingSourceConfig('manual').label,
        packageInput: manualPackageState.packageInput,
        packageInputError: null,
        isReady: true,
        isLoading: false,
        notice: '未找到可用的关联包装资料，已回退到手动试算来源。',
      }
    }

    return {
      source: 'manual' as VehicleLoadingSourceType,
      sourceLabel: getVehicleLoadingSourceConfig('manual').label,
      packageInput: null,
      packageInputError: manualPackageState.error ?? new Error('无法构造车型推荐输入'),
      isReady: false,
      isLoading: false,
      notice: null as string | null,
    }
  }, [
    hasPreferredPackagingProfile,
    isLoadingUnits,
    manualPackageState.error,
    manualPackageState.packageInput,
    manualPackageState.ready,
    packingRulePackageState.error,
    packingRulePackageState.packageInput,
    packingRulePackageState.ready,
    profilesError,
    isLoadingProfiles,
    selectedPackagingProfile,
    unitsError,
  ])

  const recommendationData = useVehicleLoadingData(summary, packageResolution.source, packageResolution.packageInput, packageResolution.isReady)
  const { reload: reloadRecommendationData } = recommendationData

  const reload = useCallback(async () => {
    if (hasPreferredPackagingProfile) {
      await Promise.all([refetchProfiles(), refetchUnits()])
    }
    reloadRecommendationData()
  }, [hasPreferredPackagingProfile, refetchProfiles, refetchUnits, reloadRecommendationData])

  return {
    source: packageResolution.source,
    sourceLabel: packageResolution.sourceLabel,
    packageInput: packageResolution.packageInput,
    packageInputError: packageResolution.packageInputError,
    packageInputNotice: packageResolution.notice,
    isLoadingPackageInput: packageResolution.isLoading,
    isPackageInputReady: packageResolution.isReady,
    selectedPackagingProfile,
    recommendations: recommendationData.recommendations,
    isLoadingSpecs: recommendationData.isLoadingSpecs,
    isLoadingRecommendations: recommendationData.isLoadingRecommendations,
    specsError: recommendationData.specsError,
    recommendationsError: recommendationData.recommendationsError,
    reload,
  }
}
