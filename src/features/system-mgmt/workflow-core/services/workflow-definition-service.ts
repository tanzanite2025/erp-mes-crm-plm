import { apiFetch } from '@/lib/api-client'

export const SALES_ORDER_WORKFLOW_MODULE = 'SALES_ORDER'

export interface WorkflowDefinitionRecord {
  id: string
  code: string
  name: string
  version: number
  module: string
  definitionJson: string
  description: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UpsertWorkflowDefinitionInput {
  id?: string
  code?: string
  name?: string
  version?: number
  definitionJson?: string
  description?: string
  isActive?: boolean
}

export const WorkflowDefinitionService = {
  listSalesOrderDefinitions: () =>
    apiFetch<WorkflowDefinitionRecord[]>(
      `/workflows/definitions?module=${SALES_ORDER_WORKFLOW_MODULE}`
    ),

  upsertSalesOrderDefinition: (input: UpsertWorkflowDefinitionInput) =>
    apiFetch<WorkflowDefinitionRecord>('/workflows/definitions', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        module: SALES_ORDER_WORKFLOW_MODULE,
      }),
    }),
}

