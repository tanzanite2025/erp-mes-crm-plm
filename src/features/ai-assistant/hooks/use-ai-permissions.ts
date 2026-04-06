import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { aiPolicyService, type AiPolicyConfig } from '../services/ai-policy-service'
import { createLogger } from '@/lib/logger'

const AI_CONFIG_KEY = 'xdfc_ai_capability_config'
const logger = createLogger('useAiPermissions')

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
      const roleIds = Array.isArray(user?.role) ? user.role.map((roleId) => String(roleId)) : []
      const allowedRoles = config?.allowedRoles || []
      const allowedUsers = config?.allowedUsers || []

      const matchedByRole = roleIds.some((roleId) => allowedRoles.includes(roleId))
      const matchedByUser = allowedUsers.includes(String(user?.username || ''))

      setIsVisible(!!config?.enabled && !!user && (matchedByRole || matchedByUser))
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
