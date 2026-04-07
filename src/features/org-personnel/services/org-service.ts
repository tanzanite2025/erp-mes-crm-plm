import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { type OrgNode } from '../data/org-schema'

/**
 * OrgService - Specialized service for organization structure integration
 */
export class OrgService {
    /**
     * Fetch complete organization tree
     */
    static async getOrgTree(): Promise<OrgNode[]> {
        const data = await apiFetch<OrgNode[]>('/org/tree')
        return ensureArrayResponse<OrgNode>(data, 'Organization tree')
    }

    /**
     * Save organization node (Create or Update)
     */
    static async saveOrgNode(node: OrgNode): Promise<OrgNode> {
        const data = await apiFetch<OrgNode>('/org', {
            method: 'POST',
            body: JSON.stringify(node)
        })
        
        if (!data) {
            throw new Error('[CRITICAL_DATA_PATH] Save organization node returned no data for: ' + (node.id || 'NEW_NODE'))
        }

        window.dispatchEvent(new CustomEvent('xdfc_org_structure_data_updated'))
        return ensureObjectResponse<OrgNode>(data, 'OrgService.saveOrgNode')
    }

    /**
     * Delete organization node
     */
    static async deleteOrgNode(id: string): Promise<void> {
        await apiFetch(`/org/${id}`, {
            method: 'DELETE'
        })
        window.dispatchEvent(new CustomEvent('xdfc_org_structure_data_updated'))
    }

    /**
     * Patch organization node (SDRTS Delta Protocol)
     */
    static async patchOrgNode(id: string, delta: DeltaSet, version: number): Promise<OrgNode> {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { id, version }
        };

        const res = await apiFetch<OrgNode>(`/org/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });

        window.dispatchEvent(new CustomEvent('xdfc_org_structure_data_updated'));
        return ensureObjectResponse<OrgNode>(res, 'OrgService.patchOrgNode');
    }
}
