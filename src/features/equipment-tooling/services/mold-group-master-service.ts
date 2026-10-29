import { z } from 'zod'
import { apiFetch } from '@/lib/api-client'
import {
  moldGroupMasterRecordSchema,
  type MoldGroupMasterRecord,
  type MoldGroupMasterWriteInput,
} from '../data/mold-group-master-schema'

export const MoldGroupMasterService = {
  async getMoldGroupDirectory(): Promise<MoldGroupMasterRecord[]> {
    const response = await apiFetch<unknown>('/mold-groups')
    return z.array(moldGroupMasterRecordSchema).parse(response)
  },

  async saveMoldGroup(
    input: MoldGroupMasterWriteInput,
    groupId?: string
  ): Promise<MoldGroupMasterRecord> {
    const response = await apiFetch<unknown>(
      groupId ? `/mold-groups/${encodeURIComponent(groupId)}` : '/mold-groups',
      { method: groupId ? 'PUT' : 'POST', body: JSON.stringify(input) }
    )
    return moldGroupMasterRecordSchema.parse(response)
  },

  async deleteMoldGroup(group: MoldGroupMasterRecord): Promise<void> {
    await apiFetch(
      `/mold-groups/${encodeURIComponent(group.id)}?version=${group.version}`,
      { method: 'DELETE' }
    )
  },
}
