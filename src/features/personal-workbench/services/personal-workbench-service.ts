import { apiFetch } from '@/lib/api-client'
import { ensureArrayField, ensureObjectResponse } from '@/lib/api-response'
import type {
  PersonalRecord,
  PersonalRecordListResponse,
  PersonalRecordReorderPayloadItem,
  PersonalRecordUpsertPayload,
} from '../data/schema'

function parseAsset(value: unknown): PersonalRecord['assets'][number] {
  const record = (value ?? {}) as Record<string, unknown>
  return {
    id: typeof record.id === 'string' ? record.id : '',
    recordId: typeof record.recordId === 'string' ? record.recordId : '',
    ownerUserId: typeof record.ownerUserId === 'string' ? record.ownerUserId : '',
    storagePath: typeof record.storagePath === 'string' ? record.storagePath : '',
    mimeType: typeof record.mimeType === 'string' ? record.mimeType : '',
    width: typeof record.width === 'number' ? record.width : 0,
    height: typeof record.height === 'number' ? record.height : 0,
    sizeBytes: typeof record.sizeBytes === 'number' ? record.sizeBytes : 0,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
  }
}

function parseRecord(value: unknown): PersonalRecord {
  const record = (value ?? {}) as Record<string, unknown>
  return {
    id: typeof record.id === 'string' ? record.id : '',
    ownerUserId: typeof record.ownerUserId === 'string' ? record.ownerUserId : '',
    title: typeof record.title === 'string' ? record.title : '',
    note: typeof record.note === 'string' ? record.note : '',
    columnKey: typeof record.columnKey === 'string' ? (record.columnKey as PersonalRecord['columnKey']) : 'INBOX',
    sortOrder: typeof record.sortOrder === 'number' ? record.sortOrder : 0,
    coverImageUrl: typeof record.coverImageUrl === 'string' ? record.coverImageUrl : '',
    archivedAt: typeof record.archivedAt === 'string' ? record.archivedAt : undefined,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '',
    assets: Array.isArray(record.assets) ? record.assets.map(parseAsset) : [],
  }
}

export async function getPersonalRecords(): Promise<PersonalRecordListResponse> {
  const context = 'PersonalWorkbenchService.getPersonalRecords'
  const response = await apiFetch<Record<string, unknown>>('/personal-workbench/records')
  const objectResponse = ensureObjectResponse<Record<string, unknown>>(response, context)
  const items = ensureArrayField<unknown>(objectResponse, 'items', context).map(parseRecord)
  const total = typeof objectResponse.total === 'number' ? objectResponse.total : items.length
  return { items, total }
}

export async function createPersonalRecord(payload: PersonalRecordUpsertPayload): Promise<PersonalRecord> {
  const response = await apiFetch<unknown>('/personal-workbench/records', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return parseRecord(response)
}

export async function patchPersonalRecord(id: string, payload: PersonalRecordUpsertPayload): Promise<PersonalRecord> {
  const response = await apiFetch<unknown>(`/personal-workbench/records/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return parseRecord(response)
}

export async function reorderPersonalRecords(payload: PersonalRecordReorderPayloadItem[]): Promise<void> {
  await apiFetch('/personal-workbench/records/reorder', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
