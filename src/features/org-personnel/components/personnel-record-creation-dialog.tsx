import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { UsersActionDialog } from '@/features/users/components/users-action-dialog'
import { type User } from '@/features/users/data/schema'
import { type OrgNode } from '../data/org-schema'
import { type PersonnelRecordCreationType } from '../data/personnel-record-creation-action-definitions'
import { personnelQueryKeys } from '../query-keys'
import { EmployeeMaintenanceService } from '../services/employee-maintenance-service'
import { OrgService } from '../services/org-service'
import { EmployeeActionDialog } from './employee-action-dialog'
import { OrgActionDialog } from './org-action-dialog'

type PersonnelRecordCreationDialogProps = {
  recordType: PersonnelRecordCreationType
  onOpenChange: (open: boolean) => void
}

export function PersonnelRecordCreationDialog({
  recordType,
  onOpenChange,
}: PersonnelRecordCreationDialogProps) {
  const navigate = useNavigate()

  function navigateToCreatedAccount(savedAccount: User) {
    void navigate({
      to: '/personnel/accounts',
      search: {
        username: savedAccount.username,
        page: 1,
        pageSize: 10,
        status: [],
      },
    })
  }

  if (recordType === 'organization')
    return <OrganizationRecordCreationDialog onOpenChange={onOpenChange} />
  if (recordType === 'employee')
    return <EmployeeRecordCreationDialog onOpenChange={onOpenChange} />
  return (
    <UsersActionDialog
      open
      onOpenChange={onOpenChange}
      onSaved={navigateToCreatedAccount}
    />
  )
}

function flattenOrganizationCreationParentOptions(
  nodes: OrgNode[],
  parentPath = ''
): { node: OrgNode; label: string }[] {
  return nodes.flatMap((node) => {
    const label = parentPath ? `${parentPath} / ${node.name}` : node.name
    const options = node.id && node.type !== 'team' ? [{ node, label }] : []
    return [
      ...options,
      ...flattenOrganizationCreationParentOptions(node.children ?? [], label),
    ]
  })
}

function OrganizationRecordCreationDialog({
  onOpenChange,
}: Pick<PersonnelRecordCreationDialogProps, 'onOpenChange'>) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [parentOrganizationId, setParentOrganizationId] = useState('')
  const organizationTreeQuery = useQuery({
    queryKey: personnelQueryKeys.orgTree(),
    queryFn: () => OrgService.getOrgTree(),
  })
  const createOrganizationMutation = useMutation({
    mutationFn: OrgService.saveOrgNode,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: personnelQueryKeys.orgTree(),
      })
      toast.success(t('orgPersonnel.org.createSuccess'))
    },
  })
  const parentOptions = flattenOrganizationCreationParentOptions(
    organizationTreeQuery.data ?? []
  )
  const parentNode = parentOptions.find(
    (option) => option.node.id === parentOrganizationId
  )?.node

  return (
    <OrgActionDialog
      open
      parentNode={parentNode}
      onOpenChange={onOpenChange}
      isSaving={createOrganizationMutation.isPending}
      onSubmit={(data) => {
        if (parentOrganizationId && !parentNode) {
          throw new Error(
            t(
              'orgPersonnel.operationGuide.actions.parentOrganizationUnavailable'
            )
          )
        }
        return createOrganizationMutation.mutateAsync(data)
      }}
      onSaved={() => {
        void navigate({ to: '/personnel/org' })
      }}
      creationParentSelector={
        <div className='mb-4 space-y-2'>
          <label
            htmlFor='organization-creation-parent'
            className='text-sm font-medium'
          >
            {t('orgPersonnel.operationGuide.actions.parentOrganization')}
          </label>
          <select
            id='organization-creation-parent'
            value={parentOrganizationId}
            onChange={(event) => setParentOrganizationId(event.target.value)}
            disabled={
              organizationTreeQuery.isPending ||
              organizationTreeQuery.isError ||
              createOrganizationMutation.isPending
            }
            className='h-11 w-full rounded-lg border bg-background px-3 text-sm'
          >
            <option value=''>
              {t('orgPersonnel.operationGuide.actions.noParentOrganization')}
            </option>
            {parentOptions.map(({ node, label }) => (
              <option key={node.id} value={node.id}>
                {label}
              </option>
            ))}
          </select>
          {organizationTreeQuery.isError && (
            <p role='alert' className='text-sm text-destructive'>
              {t(
                'orgPersonnel.operationGuide.actions.parentOrganizationsLoadFailed'
              )}
            </p>
          )}
        </div>
      }
    />
  )
}

function EmployeeRecordCreationDialog({
  onOpenChange,
}: Pick<PersonnelRecordCreationDialogProps, 'onOpenChange'>) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createEmployeeMutation = useMutation({
    mutationFn: EmployeeMaintenanceService.saveEmployee,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: personnelQueryKeys.employees(),
      })
    },
  })

  return (
    <EmployeeActionDialog
      open
      onOpenChange={onOpenChange}
      onSubmit={(data) => createEmployeeMutation.mutateAsync(data)}
      onSaved={() => {
        void navigate({ to: '/personnel/employees' })
      }}
    />
  )
}
