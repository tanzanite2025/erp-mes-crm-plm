import type { PackagingProfile } from '@/features/logistics-packaging-management/packaging-rules-service'

export function renderPackagingProfileTarget(profile: PackagingProfile) {
  const target = profile.targets[0]
  if (!target) return '未绑定产品 / 物料'
  return [target.entityName, target.entityCode].filter(Boolean).join(' · ')
}

export function renderPackagingProfileLabel(profile: PackagingProfile) {
  return [profile.name, profile.code].filter(Boolean).join(' · ')
}
