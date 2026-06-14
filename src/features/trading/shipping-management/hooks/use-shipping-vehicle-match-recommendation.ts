import { useCallback, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { type ReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import {
  packagingRulesService,
  type PackagingProfile,
} from '@/features/logistics-config/packaging-rules-service'
import {
  getVehicleLoadingSourceConfig,
  type VehicleLoadingSourceType,
} from '@/features/logistics-config/vehicle-loading/data/vehicle-loading-sources'
import type {
  ShipmentSummary,
  VehicleLoadingPackageInput,
} from '@/features/logistics-config/vehicle-loading/data/vehicle-loading.types'
import { useVehicleLoadingData } from '@/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-data'
import {
  buildManualVehicleLoadingPackageInput,
  buildVehicleLoadingPackageInputFromProfile,
} from '@/features/logistics-config/vehicle-loading/services/vehicle-loading-package-input'
import type { ShippingVehicleMatchItem } from '../types'

const SHIPPING_MATCH_PACKAGING_PROFILE_QUERY_KEY = [
  'logistics-config',
  'packaging-profiles',
] as const
const logger = createLogger('useShippingVehicleMatchRecommendation')

type ShippingVehicleMatchPackageInputResource =
  | {
      status: 'loading'
      source: VehicleLoadingSourceType
      sourceLabel: string
      packageInputNotice: string | null
      selectedPackagingProfile: PackagingProfile | null
    }
  | {
      status: 'error'
      source: VehicleLoadingSourceType
      sourceLabel: string
      packageInputNotice: string | null
      selectedPackagingProfile: PackagingProfile | null
      error: Error
      scope: string
    }
  | {
      status: 'ready'
      source: VehicleLoadingSourceType
      sourceLabel: string
      packageInputNotice: string | null
      selectedPackagingProfile: PackagingProfile | null
      packageInput: VehicleLoadingPackageInput
    }

export type ShippingVehicleMatchRecommendationReadResource = ReadResource<{
  source: VehicleLoadingSourceType
  sourceLabel: string
  packageInputNotice: string | null
  recommendations: ReturnType<typeof useVehicleLoadingData>['recommendations']
}>

function buildManualPackageInputState(summary: ShipmentSummary) {
  try {
    return {
      packageInput: buildManualVehicleLoadingPackageInput(
        summary,
        getVehicleLoadingSourceConfig('manual').label
      ),
      error: null,
      ready: true,
    }
  } catch (error) {
    return {
      packageInput: null,
      error:
        error instanceof Error ? error : new Error('无法构造手动试算包装输入'),
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
      packageInput: buildVehicleLoadingPackageInputFromProfile(
        profile,
        getVehicleLoadingSourceConfig('packing-rule').label
      ),
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

export function useShippingVehicleMatchRecommendation(
  item: ShippingVehicleMatchItem,
  summary: ShipmentSummary
) {
  const hasPreferredPackagingProfile = item.packageProfileId.trim() !== ''
  const { readResource: unitsReadResource, refetch: refetchUnits } =
    useUnitsQuery({
      enabled: hasPreferredPackagingProfile,
      staleTime: 5 * 60 * 1000,
    })
  const profilesQuery = useQuery({
    queryKey: SHIPPING_MATCH_PACKAGING_PROFILE_QUERY_KEY,
    queryFn: () => packagingRulesService.getProfiles(),
    enabled: hasPreferredPackagingProfile,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
  const { refetch: refetchProfiles } = profilesQuery
  const profilesReadResource = useMemo<
    ReadResource<PackagingProfile[]> | { status: 'idle' }
  >(() => {
    if (!hasPreferredPackagingProfile) {
      return { status: 'idle' }
    }

    const failure = resolveQueryFailure({
      data: profilesQuery.data,
      error: profilesQuery.error,
      isPending: profilesQuery.isPending,
      scope: 'useShippingVehicleMatchRecommendation.packagingProfiles',
      missingMessage:
        '[CRITICAL] Shipping recommendation packaging profiles missing after load',
      failureMessage:
        '[CRITICAL] Shipping recommendation packaging profiles query failed',
    })
    if (failure) {
      return {
        status: 'error',
        error: failure.error,
        scope: failure.scope,
      }
    }

    if (profilesQuery.isPending) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      data: profilesQuery.data as PackagingProfile[],
    }
  }, [
    hasPreferredPackagingProfile,
    profilesQuery.data,
    profilesQuery.error,
    profilesQuery.isPending,
  ])

  const activeProfiles = useMemo(
    () =>
      profilesReadResource.status === 'ready'
        ? profilesReadResource.data.filter((profile) => profile.isActive)
        : [],
    [profilesReadResource]
  )
  const selectedPackagingProfile = useMemo(
    () =>
      activeProfiles.find((profile) => profile.id === item.packageProfileId) ??
      null,
    [activeProfiles, item.packageProfileId]
  )

  const manualPackageState = useMemo(
    () => buildManualPackageInputState(summary),
    [summary]
  )
  const packingRulePackageState = useMemo(
    () => buildPackingRulePackageInputState(selectedPackagingProfile),
    [selectedPackagingProfile]
  )

  const packageInputResource =
    useMemo<ShippingVehicleMatchPackageInputResource>(() => {
      if (!hasPreferredPackagingProfile) {
        if (manualPackageState.ready && manualPackageState.packageInput) {
          return {
            status: 'ready',
            source: 'manual',
            sourceLabel: getVehicleLoadingSourceConfig('manual').label,
            packageInput: manualPackageState.packageInput,
            packageInputNotice: null,
            selectedPackagingProfile: null,
          }
        }

        return {
          status: 'error',
          source: 'manual',
          sourceLabel: getVehicleLoadingSourceConfig('manual').label,
          packageInputNotice: null,
          selectedPackagingProfile: null,
          error:
            manualPackageState.error ?? new Error('无法构造手动试算包装输入'),
          scope: 'useShippingVehicleMatchRecommendation.manualPackageInput',
        }
      }

      if (unitsReadResource.status === 'error') {
        return {
          status: 'error',
          source: 'packing-rule',
          sourceLabel: getVehicleLoadingSourceConfig('packing-rule').label,
          packageInputNotice: null,
          selectedPackagingProfile: null,
          error: unitsReadResource.error,
          scope: unitsReadResource.scope,
        }
      }

      if (profilesReadResource.status === 'error') {
        return {
          status: 'error',
          source: 'packing-rule',
          sourceLabel: getVehicleLoadingSourceConfig('packing-rule').label,
          packageInputNotice: null,
          selectedPackagingProfile: null,
          error: profilesReadResource.error,
          scope: profilesReadResource.scope,
        }
      }

      if (
        unitsReadResource.status === 'loading' ||
        profilesReadResource.status === 'loading'
      ) {
        return {
          status: 'loading',
          source: 'packing-rule',
          sourceLabel: getVehicleLoadingSourceConfig('packing-rule').label,
          packageInputNotice: null,
          selectedPackagingProfile: null,
        }
      }

      if (!selectedPackagingProfile) {
        return {
          status: 'error',
          source: 'packing-rule',
          sourceLabel: getVehicleLoadingSourceConfig('packing-rule').label,
          packageInputNotice: null,
          selectedPackagingProfile: null,
          error: new Error('未找到可用的关联包装资料，请检查包装规则配置。'),
          scope:
            'useShippingVehicleMatchRecommendation.selectedPackagingProfile',
        }
      }

      if (packingRulePackageState.error instanceof Error) {
        return {
          status: 'error',
          source: 'packing-rule',
          sourceLabel: getVehicleLoadingSourceConfig('packing-rule').label,
          packageInputNotice: null,
          selectedPackagingProfile,
          error: packingRulePackageState.error,
          scope:
            'useShippingVehicleMatchRecommendation.packingRulePackageInput',
        }
      }

      if (
        packingRulePackageState.ready &&
        packingRulePackageState.packageInput
      ) {
        return {
          status: 'ready',
          source: 'packing-rule',
          sourceLabel: getVehicleLoadingSourceConfig('packing-rule').label,
          packageInput: packingRulePackageState.packageInput,
          packageInputNotice: null,
          selectedPackagingProfile,
        }
      }

      return {
        status: 'error',
        source: 'packing-rule',
        sourceLabel: getVehicleLoadingSourceConfig('packing-rule').label,
        packageInputNotice: null,
        selectedPackagingProfile,
        error: new Error('无法构造包装规则输入'),
        scope: 'useShippingVehicleMatchRecommendation.packingRulePackageInput',
      }
    }, [
      hasPreferredPackagingProfile,
      manualPackageState.error,
      manualPackageState.packageInput,
      manualPackageState.ready,
      packingRulePackageState.error,
      packingRulePackageState.packageInput,
      packingRulePackageState.ready,
      profilesReadResource,
      selectedPackagingProfile,
      unitsReadResource,
    ])

  const recommendationData = useVehicleLoadingData(
    summary,
    packageInputResource.source,
    packageInputResource.status === 'ready'
      ? packageInputResource.packageInput
      : null,
    packageInputResource.status === 'ready'
  )
  const { reload: reloadRecommendationData } = recommendationData

  const readResource =
    useMemo<ShippingVehicleMatchRecommendationReadResource>(() => {
      if (packageInputResource.status === 'error') {
        return {
          status: 'error',
          error: packageInputResource.error,
          scope: packageInputResource.scope,
        }
      }

      if (packageInputResource.status === 'loading') {
        return { status: 'loading' }
      }

      if (recommendationData.specsError instanceof Error) {
        return {
          status: 'error',
          error: recommendationData.specsError,
          scope: 'useShippingVehicleMatchRecommendation.vehicleSpecs',
        }
      }

      if (recommendationData.recommendationsError instanceof Error) {
        return {
          status: 'error',
          error: recommendationData.recommendationsError,
          scope: 'useShippingVehicleMatchRecommendation.recommendations',
        }
      }

      if (
        recommendationData.isLoadingSpecs ||
        recommendationData.isLoadingRecommendations
      ) {
        return { status: 'loading' }
      }

      return {
        status: 'ready',
        data: {
          source: packageInputResource.source,
          sourceLabel: packageInputResource.sourceLabel,
          packageInputNotice: packageInputResource.packageInputNotice,
          recommendations: recommendationData.recommendations,
        },
      }
    }, [
      packageInputResource,
      recommendationData.isLoadingRecommendations,
      recommendationData.isLoadingSpecs,
      recommendationData.recommendations,
      recommendationData.recommendationsError,
      recommendationData.specsError,
    ])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to resolve shipping vehicle recommendation: ${readResource.scope}`,
      readResource.error
    )
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  const retryRead = useCallback(async () => {
    if (hasPreferredPackagingProfile) {
      await Promise.all([refetchProfiles(), refetchUnits()])
    }
    reloadRecommendationData()
  }, [
    hasPreferredPackagingProfile,
    refetchProfiles,
    refetchUnits,
    reloadRecommendationData,
  ])

  return {
    source: packageInputResource.source,
    sourceLabel: packageInputResource.sourceLabel,
    packageInputNotice: packageInputResource.packageInputNotice,
    selectedPackagingProfile: packageInputResource.selectedPackagingProfile,
    readResource,
    retryRead,
  }
}
