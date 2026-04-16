import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { aiPolicyService, type AiPolicyConfig } from '../services/ai-policy-service'
import { createLogger } from '@/lib/logger'
import { getAuthSessionPermissionIds } from '@/features/authz/utils/auth-session'

const AI_CONFIG_KEY = 'xdfc_ai_capability_config'
const logger = createLogger('useAiPermissions')

function normalizeIdList(values?: string[]): string[] {
  if (!Array.isArray(values)) return []

  return values
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean)
}

function normalizeUsername(value?: string): string {
  return String(value || '').trim().toLowerCase()
}

/**
 * AI 权限判定 Hook
 * 职责：统一管理 AI 功能的准入逻辑，对接后端 Policy 与本地缓存。
 */
export function useAiPermissions() {
  const user = useAuthStore(s => s.user)
  const [isVisible, setIsVisible] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  const checkVisibility = useCallback(async () => {
    setIsChecking(true)
    try {
      const remote = await aiPolicyService.getPolicy().catch(() => null)
      const local = await StorageService.getItem<AiPolicyConfig>(AI_CONFIG_KEY).catch(() => null)

      const config = remote || local
      const permissionIds = normalizeIdList(getAuthSessionPermissionIds(user))
      const allowedPermissions = normalizeIdList(config?.allowedPermissions)
      const allowedUsers = normalizeIdList(config?.allowedUsers)
      const username = normalizeUsername(user?.username)

      const matchedByPermission = permissionIds.some((permissionId) => allowedPermissions.includes(permissionId))
      const matchedByUser = !!username && allowedUsers.includes(username)

      setIsVisible(!!config?.enabled && !!user && (matchedByPermission || matchedByUser))
    } catch (e) {
      logger.error('Permission check failed', e)
      setIsVisible(false)
    } finally {
      setIsChecking(false)
    }
  }, [user])

  useEffect(() => {
    void checkVisibility()
    window.addEventListener('xdfc_ai_config_updated', checkVisibility)
    return () => window.removeEventListener('xdfc_ai_config_updated', checkVisibility)
  }, [checkVisibility])

  return {
    isVisible,
    isChecking,
    canUseDashboardSnapshot: isVisible,
    refreshPermissions: checkVisibility
  }
}
