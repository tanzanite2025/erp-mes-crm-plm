import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Cpu,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { ForbiddenState } from '@/components/forbidden-state'
import { AiEngineGatewayCard } from '@/features/ai-assistant/components/access-control/ai-engine-gateway-card'
import { AiGlobalControlCard } from '@/features/ai-assistant/components/access-control/ai-global-control-card'
import { AiRoutePermissionsCard } from '@/features/ai-assistant/components/access-control/ai-route-permissions-card'
import {
  aiPolicyService,
  type AiGatewayConfig,
} from '@/features/ai-assistant/services/ai-policy-service'
import {
  buildAiPermissionGroups,
  getAiRoutePermissionIds,
  togglePermissionSelection,
} from '@/features/ai-assistant/utils/ai-permission-groups'
import {
  DEFAULT_AI_POLICY_CONFIG,
  resolveAiPolicyForEditing,
  sanitizeAiPolicyForSave,
  type EditableAiPolicyConfig,
} from '@/features/ai-assistant/utils/ai-policy-config'
import { getRouteDerivedPermissions } from '@/features/authz/data/route-permission-registry'

const logger = createLogger('AiAccessControl')

interface PersistAiPolicyOptions {
  showConfirmation?: boolean
}

export function AiAccessControl() {
  const { t } = useLanguage()
  const routePermissions = useMemo(() => getRouteDerivedPermissions(), [])
  const aiRoutePermissionIds = useMemo(() => getAiRoutePermissionIds(), [])
  const permissionGroups = useMemo(
    () => buildAiPermissionGroups(routePermissions, aiRoutePermissionIds),
    [aiRoutePermissionIds, routePermissions]
  )

  const [policy, setPolicy] = useState<EditableAiPolicyConfig>(
    DEFAULT_AI_POLICY_CONFIG
  )
  const [gatewayDraft, setGatewayDraft] = useState<AiGatewayConfig>(
    DEFAULT_AI_POLICY_CONFIG.api
  )
  const [isGatewaySaving, setIsGatewaySaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)

  useEffect(() => {
    async function loadAiPolicy() {
      setIsLoading(true)
      try {
        setLoadError(null)
        const remotePolicy = await aiPolicyService.getPolicy()
        const editablePolicy = resolveAiPolicyForEditing(
          remotePolicy,
          aiRoutePermissionIds
        )

        setPolicy(editablePolicy)
        setGatewayDraft(editablePolicy.api)
      } catch (error) {
        setLoadError(error)
        logger.error('Failed to load AI policy', error)
      } finally {
        setIsLoading(false)
      }
    }

    void loadAiPolicy()
  }, [aiRoutePermissionIds])

  async function persistAiPolicy(
    nextPolicy: EditableAiPolicyConfig,
    options: PersistAiPolicyOptions = {}
  ): Promise<boolean> {
    const { showConfirmation = true } = options
    const previousPolicy = policy
    const sanitizedPolicy = sanitizeAiPolicyForSave(
      nextPolicy,
      aiRoutePermissionIds
    )

    setPolicy(sanitizedPolicy)
    try {
      await aiPolicyService.savePolicy(sanitizedPolicy)
      window.dispatchEvent(new CustomEvent('xdfc_ai_config_updated'))

      if (showConfirmation) {
        toast.success(t('aiAssistant.accessControl.api.policySuccess'), {
          description: t(
            'aiAssistant.accessControl.api.policySuccessDescription'
          ),
          icon: <ShieldCheck className='size-4 text-emerald-500' />,
        })
      }
      return true
    } catch (error) {
      setPolicy(previousPolicy)
      logger.error('Failed to save AI policy', error)
      toast.error(t('aiAssistant.accessControl.api.policyError'))
      return false
    }
  }

  function handleGlobalCapabilityChange(enabled: boolean) {
    void persistAiPolicy({ ...policy, enabled })
  }

  function handleRoutePermissionToggle(permissionIds: string[]) {
    const allowedPermissions = togglePermissionSelection(
      policy.allowedPermissions,
      permissionIds
    )
    void persistAiPolicy({ ...policy, allowedPermissions })
  }

  async function saveGatewayConfiguration() {
    setIsGatewaySaving(true)
    try {
      const saved = await persistAiPolicy(
        { ...policy, api: gatewayDraft },
        { showConfirmation: false }
      )
      if (!saved) return

      const redactedGatewayDraft = { ...gatewayDraft, apiKey: '' }
      setGatewayDraft(redactedGatewayDraft)
      setPolicy((currentPolicy) => ({
        ...currentPolicy,
        api: redactedGatewayDraft,
      }))

      toast.success(t('aiAssistant.accessControl.api.saveSuccess'), {
        description: t('aiAssistant.accessControl.api.saveSuccessDescription', {
          provider: gatewayDraft.provider.toUpperCase(),
        }),
        icon: <CheckCircle2 className='size-4 text-indigo-500' />,
      })
    } finally {
      setIsGatewaySaving(false)
    }
  }

  if (isForbiddenError(loadError)) {
    return <ForbiddenState />
  }

  if (isLoading) {
    return (
      <div className='scale-in flex h-64 items-center justify-center duration-500'>
        <Loader2 className='size-8 animate-spin text-indigo-400' />
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-6 p-6 duration-700 fade-in'>
      <header className='flex items-center justify-between'>
        <div className='space-y-1'>
          <h2 className='text-base font-black tracking-tighter text-slate-800 uppercase italic md:text-xl'>
            {t('aiAssistant.accessControl.title')}
          </h2>
          <p className='text-[8px] leading-none font-black tracking-widest text-indigo-500 uppercase md:text-[10px]'>
            {t('aiAssistant.accessControl.subtitle')}
          </p>
        </div>
        <div className='shrink-0 rounded-xl border border-indigo-100 bg-indigo-50 p-2 md:rounded-2xl md:p-3'>
          <Cpu className='size-4 text-indigo-600 md:size-5' />
        </div>
      </header>

      <div className='grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-6'>
        <AiGlobalControlCard
          enabled={policy.enabled}
          onEnabledChange={handleGlobalCapabilityChange}
          className='lg:col-span-4'
        />
        <AiEngineGatewayCard
          config={gatewayDraft}
          isSaving={isGatewaySaving}
          onConfigChange={setGatewayDraft}
          onSave={() => void saveGatewayConfiguration()}
          className='lg:col-span-8'
        />
        <AiRoutePermissionsCard
          permissionGroups={permissionGroups}
          selectedPermissionIds={policy.allowedPermissions}
          onTogglePermissions={handleRoutePermissionToggle}
          className='lg:col-span-12'
        />
      </div>

      <aside className='mt-4 flex items-start gap-4 rounded-[24px] border border-dashed border-amber-200 bg-amber-50/50 p-4'>
        <ShieldAlert className='mt-1 size-5 text-amber-500' />
        <div className='space-y-1'>
          <p className='text-xs font-black text-amber-700 uppercase'>
            {t('aiAssistant.accessControl.governance.title')}
          </p>
          <p className='text-[10px] leading-relaxed font-medium text-amber-600'>
            {t('aiAssistant.accessControl.governance.body')}
          </p>
        </div>
      </aside>
    </div>
  )
}
