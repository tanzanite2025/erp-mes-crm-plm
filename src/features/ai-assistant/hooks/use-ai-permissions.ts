import { useState, useEffect, useCallback, useRef } from 'react'
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
  const signedInUserId = useAuthStore((state) => state.user?.id)
  const accessToken = useAuthStore((state) => state.accessToken)
  const hasSignedInUser = Boolean(signedInUserId && accessToken)
  const permissionCheckState = useRef({ generation: 0 })
  const pathname = useLocation({ select: (location) => location.pathname })
  const [isVisible, setIsVisible] = useState(false)
  const [isRouteAllowed, setIsRouteAllowed] = useState(false)
  const [isApiConfigured, setIsApiConfigured] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [resolvedPolicyIdentity, setResolvedPolicyIdentity] = useState<{
    userId: string
    accessToken: string
    pathname: string
  } | null>(null)
  const hasCurrentIdentityPolicy = Boolean(
    hasSignedInUser &&
    resolvedPolicyIdentity?.userId === signedInUserId &&
    resolvedPolicyIdentity?.accessToken === accessToken &&
    resolvedPolicyIdentity?.pathname === pathname
  )

  const checkVisibility = useCallback(async () => {
    const requestGeneration = ++permissionCheckState.current.generation
    const requestIdentity = useAuthStore.getState()
    if (
      !signedInUserId ||
      !accessToken ||
      requestIdentity.user?.id !== signedInUserId ||
      requestIdentity.accessToken !== accessToken
    ) {
      setIsVisible(false)
      setIsRouteAllowed(false)
      setIsApiConfigured(false)
      setIsChecking(false)
      setResolvedPolicyIdentity(null)
      return
    }
    const belongsToCurrentIdentityAndRequest = () => {
      const currentIdentity = useAuthStore.getState()
      return (
        permissionCheckState.current.generation === requestGeneration &&
        currentIdentity.accessToken === accessToken &&
        currentIdentity.user?.id === signedInUserId
      )
    }
    setIsChecking(true)
    try {
      const config = await aiPolicyService.getRuntimePolicy()
      if (!belongsToCurrentIdentityAndRequest()) return
      const globalEnabledForUser = config.enabled
      const apiConfigured = config.api.configured
      const routeAllowed = isAiRoutePermissionAllowed(
        pathname,
        config.allowedPermissions
      )

      setIsVisible(globalEnabledForUser)
      setIsApiConfigured(apiConfigured)
      setIsRouteAllowed(globalEnabledForUser && routeAllowed)
    } catch (e) {
      if (!belongsToCurrentIdentityAndRequest()) return
      logger.error('Permission check failed', e)
      setIsVisible(false)
      setIsRouteAllowed(false)
      setIsApiConfigured(false)
    } finally {
      if (belongsToCurrentIdentityAndRequest()) {
        setResolvedPolicyIdentity({
          userId: signedInUserId,
          accessToken,
          pathname,
        })
        setIsChecking(false)
      }
    }
  }, [accessToken, signedInUserId, pathname])

  useEffect(() => {
    const subscribedPermissionChecks = permissionCheckState.current
    void checkVisibility()
    window.addEventListener('xdfc_ai_config_updated', checkVisibility)
    return () => {
      subscribedPermissionChecks.generation++
      window.removeEventListener('xdfc_ai_config_updated', checkVisibility)
    }
  }, [checkVisibility])

  useEffect(() => {
    void StorageService.removeItem(AI_CONFIG_KEY).catch(() => undefined)
  }, [])

  return {
    isVisible: hasCurrentIdentityPolicy && isVisible,
    isRouteAllowed: hasCurrentIdentityPolicy && isRouteAllowed,
    isApiConfigured: hasCurrentIdentityPolicy && isApiConfigured,
    isChecking: hasSignedInUser && (!hasCurrentIdentityPolicy || isChecking),
    canUsePageContext:
      hasCurrentIdentityPolicy &&
      isVisible &&
      isRouteAllowed &&
      isApiConfigured,
    canUseDashboardSnapshot:
      hasCurrentIdentityPolicy &&
      isVisible &&
      isRouteAllowed &&
      isApiConfigured,
    refreshPermissions: checkVisibility,
  }
}
