import { apiFetch } from '@/lib/api-client'
import { type Employee, type EmployeeStatus } from '../data/schema'

export type EmployeeImportMode = 'add-only' | 'sync'

export type EmployeeImportPreviewItem = {
  rowNumber?: number
  staffId: string
  name: string
  deptId?: string
  deptName?: string
  positionId?: string
  positionName?: string
  phone?: string
  gender?: string
  status?: EmployeeStatus
  action?: 'create' | 'update' | 'missing'
}

export type EmployeeImportPreviewResponse = {
  previewToken: string
  fileName: string
  sheetName: string
  importedCount: number
  createCount: number
  updateCount: number
  missingCount: number
  newEmployees: EmployeeImportPreviewItem[]
  existingEmployees: EmployeeImportPreviewItem[]
  missingEmployees: EmployeeImportPreviewItem[]
  previewRows: EmployeeImportPreviewItem[]
}

export type EmployeeImportCommitResponse = {
  status: string
  count: number
  created: number
  updated: number
  skipped: number
}

export const EmployeeTransactionService = {
  syncEmployees: async (employees: Employee[]): Promise<unknown> => {
    return await apiFetch('/employees/sync', {
      method: 'POST',
      body: JSON.stringify(employees),
    })
  },

  previewEmployeeImport: async (file: File): Promise<EmployeeImportPreviewResponse> => {
    const formData = new FormData()
    formData.append('file', file)

    return await apiFetch<EmployeeImportPreviewResponse>('/employees/import/preview', {
      method: 'POST',
      body: formData,
    })
  },

  commitEmployeeImport: async (
    previewToken: string,
    mode: EmployeeImportMode,
  ): Promise<EmployeeImportCommitResponse> => {
    return await apiFetch<EmployeeImportCommitResponse>('/employees/import/commit', {
      method: 'POST',
      body: JSON.stringify({ previewToken, mode }),
    })
  },
}
