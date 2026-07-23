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

export function toAiPolicySaveErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()

  if (normalized.includes('must use https')) {
    return 'AI 网关地址必须使用 HTTPS，例如 https://api.openai.com。'
  }
  if (
    normalized.includes('credentials') ||
    normalized.includes('query') ||
    normalized.includes('fragment')
  ) {
    return 'AI 网关地址不能包含账号密码、查询参数或 # 片段，请只填写基础地址。'
  }
  if (normalized.includes('port must be 443')) {
    return 'AI 网关地址只能使用默认 HTTPS 端口 443。'
  }
  if (normalized.includes('minimax') && normalized.includes('group id')) {
    return 'MiniMax 网关必须填写 Group ID，否则上游会拒绝认证。'
  }
  if (normalized.includes('model is too long')) {
    return '模型名称过长，请填写实际模型 ID。'
  }
  if (normalized.includes('base url is too long')) {
    return 'AI 网关地址过长，请填写稳定的基础地址。'
  }
  if (normalized.includes('api key is too long')) {
    return 'API Key 长度异常，请检查是否粘贴了多余内容。'
  }
  if (normalized.includes('unsupported route permission')) {
    return 'AI 页面能力包含已失效或不支持的路由权限，请刷新页面后重新选择。'
  }
  return 'AI 策略保存失败，请检查网关地址、模型、API Key 与页面能力配置。'
}
