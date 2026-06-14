import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import { packagingRulesService } from '@/features/logistics-config/packaging-rules-service'
import type { VehicleLoadingSourceType } from '../data/vehicle-loading-sources'
import type {
  ShipmentSummary,
  VehicleLoadingApiPackageDraft,
  VehicleLoadingPackageInput,
} from '../data/vehicle-loading.types'
import {
  buildManualVehicleLoadingPackageInput,
  buildVehicleLoadingPackageInputFromApiDraft,
  buildVehicleLoadingPackageInputFromProfile,
} from '../services/vehicle-loading-package-input'

const PACKAGING_PROFILE_QUERY_KEY = [
  'logistics-config',
  'packaging-profiles',
] as const

export function useVehicleLoadingSourcePackageInput(args: {
  source: VehicleLoadingSourceType
  summary: ShipmentSummary
  selectedPackagingProfileId: string
  apiPackageDraft: VehicleLoadingApiPackageDraft
  sourceLabel: string
}) {
  const {
    source,
    summary,
    selectedPackagingProfileId,
    apiPackageDraft,
    sourceLabel,
  } = args

  const { isLoading: isLoadingUnits, error: unitsError } = useUnitsQuery({
    enabled: source === 'packing-rule',
  })

  const profilesQuery = useQuery({
    queryKey: PACKAGING_PROFILE_QUERY_KEY,
    queryFn: () => packagingRulesService.getProfiles(),
    enabled: source === 'packing-rule',
    retry: false,
  })

  const activeProfiles = useMemo(
    () => (profilesQuery.data ?? []).filter((profile) => profile.isActive),
    [profilesQuery.data]
  )

  const selectedProfile = useMemo(() => {
    if (activeProfiles.length === 0) return null
    return (
      activeProfiles.find(
        (profile) => profile.id === selectedPackagingProfileId
      ) ??
      activeProfiles[0] ??
      null
    )
  }, [activeProfiles, selectedPackagingProfileId])

  const resolvedPackagingProfileId = selectedProfile?.id ?? ''

  const packageInputState = useMemo<{
    packageInput: VehicleLoadingPackageInput | null
    error: Error | null
    enabled: boolean
  }>(() => {
    try {
      if (source === 'packing-rule') {
        if (unitsError instanceof Error) {
          return { packageInput: null, error: unitsError, enabled: false }
        }
        if (profilesQuery.error instanceof Error) {
          return {
            packageInput: null,
            error: profilesQuery.error,
            enabled: false,
          }
        }
        if (profilesQuery.isLoading || isLoadingUnits) {
          return { packageInput: null, error: null, enabled: false }
        }
        if (!selectedProfile) {
          return {
            packageInput: null,
            error: new Error(
              'No active packaging profiles available for packing-rule source'
            ),
            enabled: false,
          }
        }
        return {
          packageInput: buildVehicleLoadingPackageInputFromProfile(
            selectedProfile,
            sourceLabel
          ),
          error: null,
          enabled: true,
        }
      }

      if (source === 'api') {
        return {
          packageInput: buildVehicleLoadingPackageInputFromApiDraft(
            apiPackageDraft,
            sourceLabel
          ),
          error: null,
          enabled: true,
        }
      }

      return {
        packageInput: buildManualVehicleLoadingPackageInput(
          summary,
          sourceLabel
        ),
        error: null,
        enabled: true,
      }
    } catch (error) {
      return {
        packageInput: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to build vehicle loading package input'),
        enabled: false,
      }
    }
  }, [
    apiPackageDraft,
    unitsError,
    profilesQuery.error,
    profilesQuery.isLoading,
    isLoadingUnits,
    selectedProfile,
    source,
    sourceLabel,
    summary,
  ])

  return {
    packageInput: packageInputState.packageInput,
    packageInputError: packageInputState.error,
    isLoadingPackageInput:
      source === 'packing-rule'
        ? profilesQuery.isLoading || isLoadingUnits
        : false,
    isPackageInputReady: packageInputState.enabled,
    packagingProfiles: activeProfiles,
    selectedPackagingProfile: selectedProfile,
    resolvedPackagingProfileId,
  }
}
