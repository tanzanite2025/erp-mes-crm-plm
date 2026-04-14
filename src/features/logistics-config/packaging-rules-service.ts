import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'

export type PackagingProfileTargetEntityType = 'material' | 'product'

export interface PackagingProfileTarget {
  id?: string
  packagingProfileId?: string
  entityType: PackagingProfileTargetEntityType
  entityId: string
  entityCode?: string
  entityName?: string
  spec?: string
  isDefault: boolean
  sortOrder: number
}

export interface PackagingProfile {
  id: string
  code: string
  name: string
  packagingType: string
  length: number
  width: number
  height: number
  dimensionUnitCode: string
  netWeight: number
  grossWeight: number
  weightUnitCode: string
  capacity: number
  capacityUnitCode: string
  assemblySource?: string
  isActive: boolean
  notes?: string
  targets: PackagingProfileTarget[]
  createdAt?: string
  updatedAt?: string
}

export type SavePackagingProfileInput = Omit<PackagingProfile, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
}

export const packagingRulesService = {
  async getProfiles(): Promise<PackagingProfile[]> {
    const res = await apiFetch<PackagingProfile[]>('/packaging/profiles')
    return ensureArrayResponse<PackagingProfile>(res, 'packagingRulesService.getProfiles')
  },

  async saveProfile(input: SavePackagingProfileInput): Promise<PackagingProfile> {
    const res = await apiFetch<PackagingProfile>('/packaging/profiles', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    return ensureObjectResponse<PackagingProfile & Record<string, unknown>>(
      res,
      'packagingRulesService.saveProfile'
    ) as PackagingProfile
  },

  async deleteProfile(id: string): Promise<void> {
    await apiFetch(`/packaging/profiles/${id}`, {
      method: 'DELETE',
    })
  },
}
