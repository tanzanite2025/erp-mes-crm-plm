import {
  type SalesOrderLine,
  type SalesOrderLinePackagingSelection,
  type SalesOrderLinePackagingSelectionSource,
} from '../data/schema'
import { type PackagingProfile } from '@/features/logistics-config/packaging-rules-service'

function matchesProduct(profile: PackagingProfile, productId?: string) {
  if (!productId) {
    return false
  }

  return profile.targets.some(
    (target) => target.entityType === 'product' && target.entityId === productId
  )
}

function dedupeProfiles(profiles: PackagingProfile[]) {
  const seen = new Set<string>()
  return profiles.filter((profile) => {
    if (seen.has(profile.id)) {
      return false
    }

    seen.add(profile.id)
    return true
  })
}

export function getPackagingProfilesForProduct(
  profiles: PackagingProfile[],
  productId?: string,
  activeOnly = false
): PackagingProfile[] {
  return dedupeProfiles(
    profiles.filter(
      (profile) => matchesProduct(profile, productId) && (!activeOnly || profile.isActive)
    )
  )
}

export function buildSalesOrderLinePackagingSelection(
  profile: PackagingProfile,
  source: SalesOrderLinePackagingSelectionSource
): SalesOrderLinePackagingSelection {
  return {
    profileId: profile.id,
    profileCode: profile.code,
    profileName: profile.name,
    packagingType: profile.packagingType,
    length: profile.length,
    width: profile.width,
    height: profile.height,
    dimensionUnitCode: profile.dimensionUnitCode,
    netWeight: profile.netWeight,
    grossWeight: profile.grossWeight,
    weightUnitCode: profile.weightUnitCode,
    capacity: profile.capacity,
    capacityUnitCode: profile.capacityUnitCode,
    source,
  }
}

export function findPackagingProfileById(
  profiles: PackagingProfile[],
  profileId?: string
): PackagingProfile | undefined {
  if (!profileId) {
    return undefined
  }

  return profiles.find((profile) => profile.id === profileId)
}

export function resolveAutoPackagingProfile(
  profiles: PackagingProfile[],
  productId?: string
): PackagingProfile | undefined {
  const activeProfiles = getPackagingProfilesForProduct(profiles, productId, true)
  if (activeProfiles.length === 0) {
    return undefined
  }

  const defaultProfiles = dedupeProfiles(
    activeProfiles.filter((profile) =>
      profile.targets.some(
        (target) =>
          target.entityType === 'product' &&
          target.entityId === productId &&
          target.isDefault
      )
    )
  )

  if (defaultProfiles.length === 1) {
    return defaultProfiles[0]
  }

  if (activeProfiles.length === 1) {
    return activeProfiles[0]
  }

  return undefined
}

export function resolveSalesOrderLinePackagingSelection(
  line: SalesOrderLine,
  profiles: PackagingProfile[]
): SalesOrderLinePackagingSelection | undefined {
  if (line.selectedPackaging?.profileId) {
    return line.selectedPackaging
  }

  const autoProfile = resolveAutoPackagingProfile(profiles, line.productId)
  if (!autoProfile) {
    return undefined
  }

  return buildSalesOrderLinePackagingSelection(autoProfile, 'auto')
}

export function createPackagingProfileFromSelection(
  selection: SalesOrderLinePackagingSelection
): PackagingProfile {
  return {
    id: selection.profileId,
    code: selection.profileCode,
    name: selection.profileName,
    packagingType: selection.packagingType,
    length: selection.length,
    width: selection.width,
    height: selection.height,
    dimensionUnitCode: selection.dimensionUnitCode,
    netWeight: selection.netWeight,
    grossWeight: selection.grossWeight,
    weightUnitCode: selection.weightUnitCode,
    capacity: selection.capacity,
    capacityUnitCode: selection.capacityUnitCode,
    assemblySource: '',
    isActive: true,
    notes: '',
    targets: [],
  }
}
