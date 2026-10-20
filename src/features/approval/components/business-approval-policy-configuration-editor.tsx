import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { type ApprovalUserOption } from '../services/approval-service'
import {
  BusinessApprovalPolicyConfigurationService,
  businessApprovalPolicyConfigurationQueryKey,
  type BusinessApprovalPolicyConfiguration,
} from '../services/business-approval-policy-configuration-service'

function formatBusinessApprovalPolicyApproverLabel(user: ApprovalUserOption) {
  const name = [user.firstName, user.lastName].filter(Boolean).join('')
  return name ? `${name} / ${user.username}` : user.username
}

export function BusinessApprovalPolicyConfigurationEditor({
  configuration,
  users,
  canManage,
}: {
  configuration: BusinessApprovalPolicyConfiguration
  users: ApprovalUserOption[]
  canManage: boolean
}) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [enabled, setEnabled] = useState(configuration.enabled)
  const [approver1Id, setApprover1Id] = useState(configuration.approver1Id)
  const [approver2Id, setApprover2Id] = useState(configuration.approver2Id)
  const saveConfiguration = useMutation({
    mutationFn: () =>
      BusinessApprovalPolicyConfigurationService.saveConfiguration(
        configuration.businessType,
        { enabled, approver1Id, approver2Id, version: configuration.version }
      ),
    onSuccess: (saved) => {
      queryClient.setQueryData<BusinessApprovalPolicyConfiguration[]>(
        businessApprovalPolicyConfigurationQueryKey,
        (current) =>
          current?.map((item) =>
            item.businessType === saved.businessType ? saved : item
          )
      )
      toast.success(t('approval.policies.saved'))
    },
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : t('approval.policies.saveFailed')
      ),
  })
  const dirty =
    enabled !== configuration.enabled ||
    approver1Id !== configuration.approver1Id ||
    approver2Id !== configuration.approver2Id
  const invalid =
    (enabled && !approver1Id) ||
    Boolean(approver2Id && (!approver1Id || approver1Id === approver2Id))
  const disabled = !canManage || saveConfiguration.isPending
  const approverFields = [
    {
      id: 'primary',
      label: t('approval.labels.l1Approver'),
      value: approver1Id,
      setValue: setApprover1Id,
    },
    {
      id: 'secondary',
      label: t('approval.labels.l2Approver'),
      value: approver2Id,
      setValue: setApprover2Id,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between gap-4'>
          <CardTitle className='text-base'>
            {configuration.businessName}
          </CardTitle>
          <div className='flex items-center gap-2'>
            <Label
              htmlFor={`approval-policy-enabled-${configuration.businessType}`}
            >
              {t('approval.policies.enabled')}
            </Label>
            <Switch
              id={`approval-policy-enabled-${configuration.businessType}`}
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={disabled}
            />
          </div>
        </div>
        <p className='text-sm text-muted-foreground'>
          {configuration.submissionDescription}
        </p>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-4 sm:grid-cols-2'>
          {approverFields.map((field) => (
            <div key={field.id} className='space-y-2'>
              <Label
                htmlFor={`approval-policy-${configuration.businessType}-${field.id}`}
              >
                {field.label}
              </Label>
              <select
                id={`approval-policy-${configuration.businessType}-${field.id}`}
                className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50'
                value={field.value}
                disabled={disabled}
                onChange={(event) => field.setValue(event.target.value)}
              >
                <option value=''>
                  {field.id === 'primary'
                    ? t('approval.policies.selectPrimary')
                    : t('approval.policies.noSecondary')}
                </option>
                {field.value &&
                  !users.some((user) => user.id === field.value) && (
                    <option value={field.value}>
                      {t('approval.policies.unavailableAccount')}
                    </option>
                  )}
                {users.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}
                    disabled={
                      field.id === 'primary'
                        ? user.id === approver2Id
                        : user.id === approver1Id
                    }
                  >
                    {formatBusinessApprovalPolicyApproverLabel(user)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className='text-sm text-muted-foreground'>
          {t('approval.policies.existingRequests')}
        </p>
        {canManage ? (
          <Button
            disabled={!dirty || invalid || saveConfiguration.isPending}
            onClick={() => saveConfiguration.mutate()}
          >
            {saveConfiguration.isPending
              ? t('approval.policies.saving')
              : t('approval.policies.save')}
          </Button>
        ) : (
          <p className='text-sm text-muted-foreground'>
            {t('approval.policies.readOnly')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
