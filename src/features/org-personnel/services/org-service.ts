import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
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
        window.dispatchEvent(new CustomEvent('xdfc_org_structure_data_updated'))
        return data
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
     * Bulk synchronize organization nodes (Data recovery)
     */
    static async syncOrgNodes(nodes: OrgNode[]): Promise<any> {
        return await apiFetch('/org/sync', {
            method: 'POST',
            body: JSON.stringify(nodes)
        })
    }
}
