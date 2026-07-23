import type {
  AiGatewayConfig,
  AiPolicyConfig,
} from '../services/ai-policy-service'

export type EditableAiPolicyConfig = Omit<AiPolicyConfig, 'api'> & {
  api: AiGatewayConfig
}

export const DEFAULT_AI_POLICY_CONFIG: EditableAiPolicyConfig = {
  enabled: false,
  allowedPermissions: [],
  api: {
    provider: 'gemini',
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com',
    model: 'gemini-1.5-flash',
    groupId: '',
  },
}

function getDefaultGatewayForProvider(
  provider: AiGatewayConfig['provider']
): AiGatewayConfig {
  const baseConfig = DEFAULT_AI_POLICY_CONFIG.api
  if (provider === 'gemini') {
    return {
      ...baseConfig,
      provider,
      baseUrl: 'https://generativelanguage.googleapis.com',
      model: 'gemini-1.5-flash',
    }
  }
  return {
    ...baseConfig,
    provider,
    baseUrl: 'https://api.openai.com',
    model: 'gpt-4o-mini',
  }
}

function normalizeGatewayConfig(config: AiGatewayConfig): AiGatewayConfig {
  const provider = ['gemini', 'openai', 'custom'].includes(config.provider)
    ? config.provider
    : DEFAULT_AI_POLICY_CONFIG.api.provider
  const defaults = getDefaultGatewayForProvider(provider)

  return {
    provider,
    apiKey: config.apiKey.trim(),
    baseUrl: (config.baseUrl.trim() || defaults.baseUrl).replace(/\/+$/g, ''),
    model: config.model.trim() || defaults.model,
    groupId: config.groupId?.trim() || '',
  }
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
  const seen = new Set<string>()

  return permissionIds.flatMap((permissionId) => {
    const normalizedPermissionId = permissionId.trim().toLowerCase()
    if (
      !allowedRoutePermissionIdSet.has(normalizedPermissionId) ||
      seen.has(normalizedPermissionId)
    ) {
      return []
    }
    seen.add(normalizedPermissionId)
    return [normalizedPermissionId]
  })
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
    api: normalizeGatewayConfig({
      ...DEFAULT_AI_POLICY_CONFIG.api,
      ...(policy?.api || {}),
    }),
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
    api: normalizeGatewayConfig(policy.api),
  }
}
