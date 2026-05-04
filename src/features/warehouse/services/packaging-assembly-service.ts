import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  packagingAssemblyCaptureSessionSchema,
  packagingAssemblyListResultSchema,
  submitPackagingAssemblyCaptureSessionInputSchema,
  type PackagingAssemblyCaptureSession,
  type PackagingAssemblyListResult,
  type SubmitPackagingAssemblyCaptureSessionInput,
} from '../data/schema'

const PACKAGING_ASSEMBLY_ENDPOINT = '/warehouse/packaging-assemblies'
const CAPTURE_SESSION_ENDPOINT = `${PACKAGING_ASSEMBLY_ENDPOINT}/capture-sessions`

export type {
  PackagingAssembly,
  PackagingAssemblyCaptureSession,
  PackagingAssemblyCaptureStatus,
  PackagingAssemblyItem,
  PackagingAssemblyListResult,
  SubmitPackagingAssemblyCaptureSessionInput,
} from '../data/schema'

export const PackagingAssemblyService = {
  async list(limit = 20): Promise<PackagingAssemblyListResult> {
    const res = await apiFetch<Record<string, unknown>>(`${PACKAGING_ASSEMBLY_ENDPOINT}?limit=${limit}`)
    const payload = ensureObjectResponse(res, 'PackagingAssemblyService.list')
    return packagingAssemblyListResultSchema.parse(payload)
  },

  async createCaptureSession(): Promise<PackagingAssemblyCaptureSession> {
    const res = await apiFetch<Record<string, unknown>>(CAPTURE_SESSION_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    return packagingAssemblyCaptureSessionSchema.parse(
      ensureObjectResponse(res, 'PackagingAssemblyService.createCaptureSession')
    )
  },

  async getCaptureSession(sessionId: string): Promise<PackagingAssemblyCaptureSession> {
    const res = await apiFetch<Record<string, unknown>>(`${CAPTURE_SESSION_ENDPOINT}/${sessionId}`)
    return packagingAssemblyCaptureSessionSchema.parse(
      ensureObjectResponse(res, 'PackagingAssemblyService.getCaptureSession')
    )
  },

  async submitCaptureSession(
    sessionId: string,
    input: SubmitPackagingAssemblyCaptureSessionInput,
  ): Promise<PackagingAssemblyCaptureSession> {
    const payload = submitPackagingAssemblyCaptureSessionInputSchema.parse(input)
    const res = await apiFetch<Record<string, unknown>>(
      `${CAPTURE_SESSION_ENDPOINT}/${sessionId}/submit`,
      {
        ignoreBreaker: true,
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )
    return packagingAssemblyCaptureSessionSchema.parse(
      ensureObjectResponse(res, 'PackagingAssemblyService.submitCaptureSession')
    )
  },
}
