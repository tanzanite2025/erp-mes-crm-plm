'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type EquipmentPartner } from '../data/schema'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

/**
 * EquipmentPartnerService - 管理模具流转单位 (工厂、供应商等 - 已同步至后端)
 */
export class EquipmentPartnerService {
    /**
     * 获取所有单位
     */
    static async getPartners(): Promise<EquipmentPartner[]> {
        const data = await apiFetch<EquipmentPartner[]>('/equipment-partners')
        return ensureArrayResponse<EquipmentPartner>(data, 'Equipment partners')
    }

    /**
     * 保存所有单位 (批量)
     */
    static async savePartners(partners: EquipmentPartner[]) {
        await apiFetch('/equipment-partners/batch', {
            method: 'POST',
            body: JSON.stringify(partners)
        })
        window.dispatchEvent(new CustomEvent('xdfc_partners_updated'))
    }

    /**
     * 添加或更新单位
     */
    static async upsertPartner(partner: Partial<EquipmentPartner>): Promise<EquipmentPartner> {
        const res = await apiFetch<EquipmentPartner>('/equipment-partners', {
            method: 'POST',
            body: JSON.stringify(partner)
        })

        if (!res) {
            throw new Error('[CRITICAL_DATA_PATH] Upsert partner failed, returned no data.')
        }

        window.dispatchEvent(new CustomEvent('xdfc_partners_updated'))
        return ensureObjectResponse<EquipmentPartner>(res, 'EquipmentPartnerService.upsertPartner')
    }

    /**
     * 删除单位
     */
    static async deletePartner(id: string) {
        await apiFetch(`/equipment-partners/${id}`, {
            method: 'DELETE'
        })
        window.dispatchEvent(new CustomEvent('xdfc_partners_updated'))
    }

    /**
     * 局部更新合作伙伴信息 (SDRTS 结构化差量更新)
     */
    static async patchPartner(id: string, delta: DeltaSet, version: number): Promise<EquipmentPartner> {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { id, version }
        }

        const res = await apiFetch<EquipmentPartner>(`/equipment-partners/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        })

        if (!res) {
            throw new Error(`[CRITICAL_DATA_PATH] Patch partner ${id} failed, returned no data.`)
        }

        window.dispatchEvent(new CustomEvent('xdfc_partners_updated'))
        return ensureObjectResponse<EquipmentPartner>(res, 'EquipmentPartnerService.patchPartner')
    }
}
