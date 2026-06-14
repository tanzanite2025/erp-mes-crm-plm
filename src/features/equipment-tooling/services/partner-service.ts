'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { buildVersionedPatchMetadata } from '@/lib/version-guard'
import {
  type SaveEquipmentPartnerInput,
  toEquipmentPartnerContract,
  toEquipmentPartnerContracts,
  toSaveEquipmentPartnerApiDTO,
} from '../adapters/equipment-partner-api-adapter'
import {
  type DeleteEquipmentPartnerApiDTO,
  type EquipmentPartnerApiDTO,
} from '../contracts/equipment-partner-api-dto'
import { type EquipmentPartner } from '../data/schema'

const EQUIPMENT_PARTNER_PATCH_INTENT_SAVE = 'EQUIPMENT_PARTNER_PATCH_SAVE'

export class EquipmentPartnerService {
  static async getPartners(): Promise<EquipmentPartner[]> {
    const data = await apiFetch<EquipmentPartnerApiDTO[]>('/equipment-partners')
    return toEquipmentPartnerContracts(
      ensureArrayResponse<EquipmentPartnerApiDTO>(
        data,
        'EquipmentPartnerService.getPartners'
      )
    )
  }

  static async upsertPartner(
    partner: SaveEquipmentPartnerInput
  ): Promise<EquipmentPartner> {
    const res = await apiFetch<EquipmentPartnerApiDTO>('/equipment-partners', {
      method: 'POST',
      body: JSON.stringify(toSaveEquipmentPartnerApiDTO(partner)),
    })

    const saved = toEquipmentPartnerContract(
      ensureObjectResponse<EquipmentPartnerApiDTO & Record<string, unknown>>(
        res,
        'EquipmentPartnerService.upsertPartner'
      ) as EquipmentPartnerApiDTO
    )

    return saved
  }

  static async deletePartner(id: string): Promise<void> {
    const res = await apiFetch<DeleteEquipmentPartnerApiDTO>(
      `/equipment-partners/${id}`,
      {
        method: 'DELETE',
      }
    )

    ensureObjectResponse<
      DeleteEquipmentPartnerApiDTO & Record<string, unknown>
    >(res, 'EquipmentPartnerService.deletePartner')
  }

  static async patchPartner(
    id: string,
    delta: DeltaSet,
    version: number
  ): Promise<EquipmentPartner> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: buildVersionedPatchMetadata(
        id,
        version,
        'EquipmentPartnerService.patchPartner',
        {
          intent: EQUIPMENT_PARTNER_PATCH_INTENT_SAVE,
        }
      ),
    }

    const res = await apiFetch<EquipmentPartnerApiDTO>(
      `/equipment-partners/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    )

    const saved = toEquipmentPartnerContract(
      ensureObjectResponse<EquipmentPartnerApiDTO & Record<string, unknown>>(
        res,
        'EquipmentPartnerService.patchPartner'
      ) as EquipmentPartnerApiDTO
    )

    return saved
  }
}
