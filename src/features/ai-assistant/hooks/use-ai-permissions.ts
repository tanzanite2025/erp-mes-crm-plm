import { useState, useEffect, useCallback } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { createLogger } from '@/lib/logger'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { aiPolicyService } from '../services/ai-policy-service'
import { isAiRoutePermissionAllowed } from '../utils/ai-permission-groups'

const AI_CONFIG_KEY = 'xdfc_ai_capability_config'
const logger = createLogger('useAiPermissions')

/**
 * AI 权限判定 Hook
 * 职责：拆分全局 AI 入口与当前路由页面能力。
 * 账号能否访问页面由独立的账号权限体系负责。
 */
export function useAiPermissions() {
  const hasSignedInUser = useAuthStore((s) => !!s.user)
  const pathname = useLocation({ select: (location) => location.pathname })
  const [isVisible, setIsVisible] = useState(false)
  const [isRouteAllowed, setIsRouteAllowed] = useState(false)
  const [isApiConfigured, setIsApiConfigured] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  const checkVisibility = useCallback(async () => {
    setIsChecking(true)
    try {
      const config = await aiPolicyService.getRuntimePolicy()
      const globalEnabledForUser = config.enabled && hasSignedInUser
      const apiConfigured = config.api.configured
      const routeAllowed = isAiRoutePermissionAllowed(
        pathname,
        config.allowedPermissions
      )

      setIsVisible(globalEnabledForUser)
      setIsApiConfigured(apiConfigured)
      setIsRouteAllowed(globalEnabledForUser && routeAllowed)
    } catch (e) {
      logger.error('Permission check failed', e)
      setIsVisible(false)
      setIsRouteAllowed(false)
      setIsApiConfigured(false)
    } finally {
      setIsChecking(false)
    }
  }, [hasSignedInUser, pathname])

  useEffect(() => {
    void checkVisibility()
    window.addEventListener('xdfc_ai_config_updated', checkVisibility)
    return () =>
      window.removeEventListener('xdfc_ai_config_updated', checkVisibility)
  }, [checkVisibility])

  useEffect(() => {
    void StorageService.removeItem(AI_CONFIG_KEY).catch(() => undefined)
  }, [])

  return {
    isVisible,
    isRouteAllowed,
    isApiConfigured,
    isChecking,
    canUsePageContext: isVisible && isRouteAllowed && isApiConfigured,
    canUseDashboardSnapshot: isVisible && isRouteAllowed && isApiConfigured,
    refreshPermissions: checkVisibility,
  }
}
