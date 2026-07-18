import type {
  AiGatewayConfig,
  AiPolicyConfig,
} from '../services/ai-policy-service'

export type EditableAiPolicyConfig = Omit<AiPolicyConfig, 'api'> & {
  api: AiGatewayConfig
}

export const DEFAULT_AI_POLICY_CONFIG: EditableAiPolicyConfig = {
  enabled: true,
  allowedPermissions: [],
  api: {
    provider: 'gemini',
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com',
    model: 'gemini-1.5-flash',
    groupId: '',
  },
}

function retainAllowedRoutePermissions(
  permissionIds: ReadonlyArray<string>,
  allowedRoutePermissionIds: ReadonlyArray<string>
): string[] {
  const allowedRoutePermissionIdSet = new Set(
    allowedRoutePermissionIds.map((permissionId) =>
      permissionId.trim().toLowerCase()
    )
  )

  return permissionIds.filter((permissionId) =>
    allowedRoutePermissionIdSet.has(permissionId.trim().toLowerCase())
  )
}

export function resolveAiPolicyForEditing(
  policy: AiPolicyConfig | null,
  allowedRoutePermissionIds: ReadonlyArray<string>
): EditableAiPolicyConfig {
  return {
    ...DEFAULT_AI_POLICY_CONFIG,
    ...policy,
    allowedPermissions: retainAllowedRoutePermissions(
      policy?.allowedPermissions || [],
      allowedRoutePermissionIds
    ),
    api: {
      ...DEFAULT_AI_POLICY_CONFIG.api,
      ...(policy?.api || {}),
    },
  }
}

export function sanitizeAiPolicyForSave(
  policy: EditableAiPolicyConfig,
  allowedRoutePermissionIds: ReadonlyArray<string>
): EditableAiPolicyConfig {
  return {
    ...policy,
    allowedPermissions: retainAllowedRoutePermissions(
      policy.allowedPermissions,
      allowedRoutePermissionIds
    ),
  }
}
