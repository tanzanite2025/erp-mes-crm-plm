import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { BusinessApprovalPolicyConfigurationEditor } from '../components/business-approval-policy-configuration-editor'
import { ApprovalService } from '../services/approval-service'
import {
  BusinessApprovalPolicyConfigurationService,
  businessApprovalPolicyConfigurationQueryKey,
} from '../services/business-approval-policy-configuration-service'

export function BusinessApprovalPolicyConfigurations() {
  const { t } = useLanguage()
  const { allowsPermission } = usePermissionActions()
  const canManage = allowsPermission('perm_manage')
  const policiesQuery = useQuery({
    queryKey: businessApprovalPolicyConfigurationQueryKey,
    queryFn: BusinessApprovalPolicyConfigurationService.fetchConfigurations,
  })
  const usersQuery = useQuery({
    queryKey: ['business-approval-policy-user-options'],
    queryFn: ApprovalService.fetchUserOptions,
  })
  const error = policiesQuery.error ?? usersQuery.error

  return (
    <div className='space-y-5'>
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-lg font-semibold'>
            {t('approval.policies.title')}
          </h1>
          <p className='text-sm text-muted-foreground'>
            {t('approval.policies.description')}
          </p>
        </div>
        <Button
          variant='outline'
          onClick={() => {
            void policiesQuery.refetch()
            void usersQuery.refetch()
          }}
        >
          {t('approval.policies.refresh')}
        </Button>
      </div>
      {error ? (
        <p role='alert' className='text-sm text-destructive'>
          {error instanceof Error
            ? error.message
            : t('approval.policies.loadFailed')}
        </p>
      ) : policiesQuery.isPending || usersQuery.isPending ? (
        <p className='text-sm text-muted-foreground'>
          {t('approval.policies.loading')}
        </p>
      ) : (
        policiesQuery.data?.map((configuration) => (
          <BusinessApprovalPolicyConfigurationEditor
            key={`${configuration.businessType}:${configuration.version}`}
            configuration={configuration}
            users={(usersQuery.data ?? []).filter(
              (user) => !user.status || user.status === 'active'
            )}
            canManage={canManage}
          />
        ))
      )}
    </div>
  )
}
