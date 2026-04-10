'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { type EquipmentPartner } from '../data/schema'
import {
  toEquipmentPartnerContract,
  toEquipmentPartnerContracts,
  toSaveEquipmentPartnerApiDTO,
} from '../adapters/equipment-partner-api-adapter'
import {
  type DeleteEquipmentPartnerApiDTO,
  type EquipmentPartnerApiDTO,
} from '../contracts/equipment-partner-api-dto'

function broadcastPartnerUpdate() {
  window.dispatchEvent(new CustomEvent('xdfc_partners_updated'))
}

export class EquipmentPartnerService {
  static async getPartners(): Promise<EquipmentPartner[]> {
    const data = await apiFetch<EquipmentPartnerApiDTO[]>('/equipment-partners')
    return toEquipmentPartnerContracts(
      ensureArrayResponse<EquipmentPartnerApiDTO>(data, 'EquipmentPartnerService.getPartners')
    )
  }

  static async upsertPartner(partner: Partial<EquipmentPartner>): Promise<EquipmentPartner> {
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

    broadcastPartnerUpdate()
    return saved
  }

  static async deletePartner(id: string): Promise<void> {
    const res = await apiFetch<DeleteEquipmentPartnerApiDTO>(`/equipment-partners/${id}`, {
      method: 'DELETE',
    })

    ensureObjectResponse<DeleteEquipmentPartnerApiDTO & Record<string, unknown>>(
      res,
      'EquipmentPartnerService.deletePartner'
    )
    broadcastPartnerUpdate()
  }

  static async patchPartner(id: string, delta: DeltaSet, version: number): Promise<EquipmentPartner> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id, version },
    }

    const res = await apiFetch<EquipmentPartnerApiDTO>(`/equipment-partners/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    const saved = toEquipmentPartnerContract(
      ensureObjectResponse<EquipmentPartnerApiDTO & Record<string, unknown>>(
        res,
        'EquipmentPartnerService.patchPartner'
      ) as EquipmentPartnerApiDTO
    )

    broadcastPartnerUpdate()
    return saved
  }
}
