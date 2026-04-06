'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import { type EquipmentPartner } from '../data/schema'

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
    static async upsertPartner(partner: Partial<EquipmentPartner>) {
        await apiFetch('/equipment-partners', {
            method: 'POST',
            body: JSON.stringify(partner)
        })
        window.dispatchEvent(new CustomEvent('xdfc_partners_updated'))
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
}
