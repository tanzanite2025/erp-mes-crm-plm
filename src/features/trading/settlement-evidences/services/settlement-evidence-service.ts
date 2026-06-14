import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import type {
  CreateSettlementRecordEvidenceApiDTO,
  SettlementRecordEvidenceApiDTO,
  UploadedSettlementEvidenceImageApiDTO,
} from '../contracts/settlement-evidence-api-dto'

export type SettlementRecordEvidenceType = 'receipt' | 'payment'

function getEvidenceBasePath(
  type: SettlementRecordEvidenceType,
  recordId: string
): string {
  return type === 'receipt'
    ? `/receipt-records/${recordId}/evidences`
    : `/payment-records/${recordId}/evidences`
}

export async function getSettlementRecordEvidences(
  type: SettlementRecordEvidenceType,
  recordId: string
): Promise<SettlementRecordEvidenceApiDTO[]> {
  const res = await apiFetch<SettlementRecordEvidenceApiDTO[]>(
    getEvidenceBasePath(type, recordId)
  )
  return ensureArrayResponse<SettlementRecordEvidenceApiDTO>(
    res,
    'SettlementEvidenceService.getSettlementRecordEvidences'
  )
}

export async function createSettlementRecordEvidence(
  type: SettlementRecordEvidenceType,
  recordId: string,
  payload: CreateSettlementRecordEvidenceApiDTO
): Promise<SettlementRecordEvidenceApiDTO> {
  const res = await apiFetch<SettlementRecordEvidenceApiDTO>(
    getEvidenceBasePath(type, recordId),
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
  return ensureObjectResponse<
    SettlementRecordEvidenceApiDTO & Record<string, unknown>
  >(
    res,
    'SettlementEvidenceService.createSettlementRecordEvidence'
  ) as SettlementRecordEvidenceApiDTO
}

export async function deleteSettlementRecordEvidence(
  type: SettlementRecordEvidenceType,
  recordId: string,
  evidenceId: string
): Promise<void> {
  await apiFetch(getEvidenceBasePath(type, recordId) + `/${evidenceId}`, {
    method: 'DELETE',
  })
}

export async function uploadSettlementEvidenceImage(
  uploadPath: string,
  file: File
): Promise<UploadedSettlementEvidenceImageApiDTO> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiFetch<UploadedSettlementEvidenceImageApiDTO>(
    uploadPath,
    {
      method: 'POST',
      body: formData,
    }
  )
  return ensureObjectResponse<
    UploadedSettlementEvidenceImageApiDTO & Record<string, unknown>
  >(
    res,
    'SettlementEvidenceService.uploadSettlementEvidenceImage'
  ) as UploadedSettlementEvidenceImageApiDTO
}
