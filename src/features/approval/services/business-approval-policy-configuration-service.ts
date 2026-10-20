import { apiFetch } from '@/lib/api-client'

export interface BusinessApprovalPolicyConfiguration {
  businessType: string
  businessName: string
  submissionDescription: string
  enabled: boolean
  approver1Id: string
  approver2Id: string
  version: number
  updatedAt: string | null
}

export type BusinessApprovalPolicyConfigurationWriteInput = Pick<
  BusinessApprovalPolicyConfiguration,
  'enabled' | 'approver1Id' | 'approver2Id' | 'version'
>

export const businessApprovalPolicyConfigurationQueryKey = [
  'business-approval-policy-configurations',
] as const

export function usesIndependentBusinessApprovalConfiguration(
  sourceCode: string
) {
  return sourceCode === 'QUALITY_STANDARD'
}

export const BusinessApprovalPolicyConfigurationService = {
  fetchConfigurations: () =>
    apiFetch<BusinessApprovalPolicyConfiguration[]>('/approvals/policies'),
  saveConfiguration: (
    businessType: string,
    input: BusinessApprovalPolicyConfigurationWriteInput
  ) =>
    apiFetch<BusinessApprovalPolicyConfiguration>(
      `/approvals/policies/${encodeURIComponent(businessType)}`,
      { method: 'PUT', body: JSON.stringify(input) }
    ),
}
