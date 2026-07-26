import {
  type PackagingProfile,
  type PackagingProfileTarget,
  type SavePackagingProfileInput,
} from './packaging-rules-service'

export type PackagingProfileDraft = SavePackagingProfileInput

export function createDefaultPackagingProfileTarget(): PackagingProfileTarget {
  return {
    entityType: 'product',
    entityId: '',
    entityCode: '',
    entityName: '',
    spec: '',
    isDefault: true,
    sortOrder: 0,
  }
}

export function createEmptyPackagingProfileDraft(): PackagingProfileDraft {
  return {
    code: '',
    name: '',
    packagingType: 'carton',
    length: 0,
    width: 0,
    height: 0,
    dimensionUnitCode: '',
    netWeight: 0,
    grossWeight: 0,
    weightUnitCode: '',
    capacity: 1,
    capacityUnitCode: 'pcs',
    canRotate: true,
    canInvert: false,
    assemblySource: '',
    isActive: true,
    notes: '',
    targets: [createDefaultPackagingProfileTarget()],
  }
}

export function mapPackagingProfileToDraft(
  profile: PackagingProfile
): PackagingProfileDraft {
  return {
    id: profile.id,
    code: profile.code,
    name: profile.name,
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
    canRotate: profile.canRotate,
    canInvert: profile.canInvert,
    assemblySource: '',
    isActive: profile.isActive,
    notes: profile.notes ?? '',
    targets:
      profile.targets.length > 0
        ? [profile.targets[0]]
        : [createDefaultPackagingProfileTarget()],
  }
}
