import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaSet } from '@/lib/delta/types'
import { buildVersionedPatchMetadata } from '@/lib/version-guard'
import { normalizeMachineCode } from '@/lib/codecs/code-normalization'
import {
  bomSectionConfigSchema,
  bomSectionListSchema,
  bomSectionOptionSchema,
  type BOMSectionConfig,
  type BOMSectionOption,
} from '../data/bom-section-schema'

export const BOM_SECTION_INTENT_CREATE = 'BOM_SECTION_CREATE'
export const BOM_SECTION_PATCH_INTENT_SAVE = 'BOM_SECTION_PATCH_SAVE'

export type BOMSectionCreatePayload = Omit<BOMSectionConfig, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'legacyNames'>

function sanitizeSectionPayload(payload: BOMSectionCreatePayload) {
  return {
    ...payload,
    code: normalizeMachineCode(payload.code),
    name: payload.name.trim(),
    description: (payload.description ?? '').trim(),
  }
}

export const BOMSectionService = {
  async getSectionList(): Promise<BOMSectionConfig[]> {
    const response = await apiFetch('/engineering/bom-sections')
    return bomSectionListSchema.parse(
      ensureObjectResponse<Record<string, unknown>>(response, 'BOMSectionService.getSectionList')
    ).items
  },

  async getSectionOptions(): Promise<BOMSectionOption[]> {
    const response = await apiFetch('/engineering/bom-sections/options')
    return ensureArrayResponse<unknown>(response, 'BOMSectionService.getSectionOptions').map((item) =>
      bomSectionOptionSchema.parse(item)
    )
  },

  async createSection(section: BOMSectionCreatePayload): Promise<BOMSectionConfig> {
    const response = await apiFetch('/engineering/bom-sections', {
      method: 'POST',
      body: JSON.stringify(sanitizeSectionPayload(section)),
    })

    return bomSectionConfigSchema.parse(
      ensureObjectResponse<Record<string, unknown>>(response, 'BOMSectionService.createSection')
    )
  },

  async patchSection(id: string, delta: DeltaSet, version: number): Promise<BOMSectionConfig> {
    const response = await apiFetch(`/engineering/bom-sections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        op: 'PATCH',
        delta,
        metadata: buildVersionedPatchMetadata(id, version, 'BOMSectionService.patchSection', {
          intent: BOM_SECTION_PATCH_INTENT_SAVE,
        }),
      }),
    })

    return bomSectionConfigSchema.parse(
      ensureObjectResponse<Record<string, unknown>>(response, 'BOMSectionService.patchSection')
    )
  },

  async deleteSection(id: string): Promise<void> {
    await apiFetch(`/engineering/bom-sections/${id}`, {
      method: 'DELETE',
    })
  },
}
