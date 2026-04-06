import { apiFetch } from '@/lib/api-client'

export interface PDAIngestRequest {
  rawCode: string
  symbology?: string
  deviceId?: string
  scene?: string
  taskId?: string
  materialCode?: string
  batchNo?: string
  scannedQty?: number
  scannerId?: string
  metadata?: Record<string, unknown>
}

export interface PDAIngestParsedSegments {
  year: string
  monthCode: string
  monthLabel: string
  day: string
  modelCode: string
  appearanceCode: string
  holePrefix: string
  holePrefixLabel: string
  holes: string
  serial: string
}

export interface PDAIngestParsedResult {
  protocol: string
  rawCode: string
  productionDate: string
  summary: string
  shortTag: string
  segments: PDAIngestParsedSegments
}

export interface PDAIngestResolvedProduct {
  id: string
  sku: string
  name: string
  modelCode: string
  status: string
}

export interface PDAIngestResolvedMaterial {
  id: string
  code: string
  name: string
  status: string
}

export interface PDAIngestBridgeResult {
  applied: boolean
  taskId?: string
  materialCode?: string
  batchNo?: string
  scannedQty?: number
}

export interface PDAIngestResponse {
  message: string
  protocol: string
  parsed: PDAIngestParsedResult
  resolved?: {
    product?: PDAIngestResolvedProduct | null
    material?: PDAIngestResolvedMaterial | null
  }
  bridge?: PDAIngestBridgeResult
}

export const pdaIngestService = {
  async ingest(payload: PDAIngestRequest): Promise<PDAIngestResponse> {
    return apiFetch<PDAIngestResponse>('/pda/ingest', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}
