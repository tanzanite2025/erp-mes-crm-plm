import { apiFetch } from '@/lib/api-client'
import { ensureArrayField, ensureObjectResponse } from '@/lib/api-response'

const PACKAGING_ASSEMBLY_ENDPOINT = '/warehouse/packaging-assemblies'
const CAPTURE_SESSION_ENDPOINT = `${PACKAGING_ASSEMBLY_ENDPOINT}/capture-sessions`

export type PackagingAssemblyCaptureStatus = 'Waiting' | 'Submitted' | 'Expired'

export interface PackagingAssemblyItem {
  id: string
  productBarcode: string
  productBarcodeBindingId: string
  barcodeProtocol: string
  barcodeSummary: string
  sortOrder: number
}

export interface PackagingAssembly {
  id: string
  packageCode: string
  status: string
  itemCount: number
  source: string
  sessionId: string
  assembledBy: string
  assembledAt?: string
  createdAt: string
  items: PackagingAssemblyItem[]
}

export interface PackagingAssemblyListResult {
  items: PackagingAssembly[]
  total: number
}

export interface PackagingAssemblyCaptureSession {
  sessionId: string
  uploadToken?: string
  status: PackagingAssemblyCaptureStatus
  packageCode: string
  assemblyId: string
  assembly?: PackagingAssembly
  submittedAt?: string
  expiresAt: string
}

export interface SubmitPackagingAssemblyCaptureSessionInput {
  token: string
  productBarcodes: string[]
}

function apiBaseUrl(): string {
  return `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1`
}

async function publicApiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const message =
      (errorData as { error?: string; message?: string }).error ||
      (errorData as { error?: string; message?: string }).message ||
      `Request failed: ${response.status}`
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

function normalizeItem(input: Record<string, unknown>): PackagingAssemblyItem {
  return {
    id: String(input.id ?? '').trim(),
    productBarcode: String(input.productBarcode ?? '').trim(),
    productBarcodeBindingId: String(input.productBarcodeBindingId ?? '').trim(),
    barcodeProtocol: String(input.barcodeProtocol ?? '').trim(),
    barcodeSummary: String(input.barcodeSummary ?? '').trim(),
    sortOrder: Number(input.sortOrder ?? 0),
  }
}

function normalizeAssembly(input: Record<string, unknown>): PackagingAssembly {
  return {
    id: String(input.id ?? '').trim(),
    packageCode: String(input.packageCode ?? '').trim(),
    status: String(input.status ?? '').trim(),
    itemCount: Number(input.itemCount ?? 0),
    source: String(input.source ?? '').trim(),
    sessionId: String(input.sessionId ?? '').trim(),
    assembledBy: String(input.assembledBy ?? '').trim(),
    assembledAt: typeof input.assembledAt === 'string' ? input.assembledAt : undefined,
    createdAt: String(input.createdAt ?? '').trim(),
    items: ensureArrayField<Record<string, unknown>>(input, 'items', 'PackagingAssembly.items').map(normalizeItem),
  }
}

function normalizeCaptureSession(input: Record<string, unknown>): PackagingAssemblyCaptureSession {
  const assemblyRaw = input.assembly
  const assembly =
    assemblyRaw && typeof assemblyRaw === 'object' && !Array.isArray(assemblyRaw)
      ? normalizeAssembly(assemblyRaw as Record<string, unknown>)
      : undefined

  return {
    sessionId: String(input.sessionId ?? '').trim(),
    uploadToken: typeof input.uploadToken === 'string' ? input.uploadToken : undefined,
    status: (String(input.status ?? 'Waiting').trim() || 'Waiting') as PackagingAssemblyCaptureStatus,
    packageCode: String(input.packageCode ?? '').trim(),
    assemblyId: String(input.assemblyId ?? '').trim(),
    assembly,
    submittedAt: typeof input.submittedAt === 'string' ? input.submittedAt : undefined,
    expiresAt: String(input.expiresAt ?? '').trim(),
  }
}

export const PackagingAssemblyService = {
  async list(limit = 20): Promise<PackagingAssemblyListResult> {
    const res = await apiFetch<Record<string, unknown>>(`${PACKAGING_ASSEMBLY_ENDPOINT}?limit=${limit}`)
    const payload = ensureObjectResponse(res, 'PackagingAssemblyService.list')
    return {
      items: ensureArrayField<Record<string, unknown>>(payload, 'items', 'PackagingAssemblyService.list.items')
        .map(normalizeAssembly),
      total: Number(payload.total ?? 0),
    }
  },

  async createCaptureSession(): Promise<PackagingAssemblyCaptureSession> {
    const res = await apiFetch<Record<string, unknown>>(CAPTURE_SESSION_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    return normalizeCaptureSession(ensureObjectResponse(res, 'PackagingAssemblyService.createCaptureSession'))
  },

  async getCaptureSession(sessionId: string): Promise<PackagingAssemblyCaptureSession> {
    const res = await apiFetch<Record<string, unknown>>(`${CAPTURE_SESSION_ENDPOINT}/${sessionId}`)
    return normalizeCaptureSession(ensureObjectResponse(res, 'PackagingAssemblyService.getCaptureSession'))
  },

  async submitCaptureSession(
    sessionId: string,
    input: SubmitPackagingAssemblyCaptureSessionInput,
  ): Promise<PackagingAssemblyCaptureSession> {
    const res = await publicApiFetch<Record<string, unknown>>(
      `${CAPTURE_SESSION_ENDPOINT}/${sessionId}/submit`,
      {
        method: 'POST',
        body: JSON.stringify({
          token: input.token,
          productBarcodes: input.productBarcodes,
        }),
      },
    )
    return normalizeCaptureSession(ensureObjectResponse(res, 'PackagingAssemblyService.submitCaptureSession'))
  },
}
