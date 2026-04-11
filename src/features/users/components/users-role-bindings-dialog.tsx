'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShieldPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/context/language-provider'
import { useRoles } from '@/features/system-mgmt/hooks/use-roles'
import { type User } from '../data/schema'
import { useUserAccessSnapshotQuery, useUserMutations, useUserRoleBindingsQuery } from '../hooks/use-users'

type UsersRoleBindingsDialogProps = {
  currentRow?: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersRoleBindingsDialog({
  currentRow,
  open,
  onOpenChange,
}: UsersRoleBindingsDialogProps) {
  const { t } = useLanguage()
  const { roles: dynamicRoles } = useRoles()
  const [pendingAddRole, setPendingAddRole] = useState('')

  const userID = (currentRow?.id || '').trim()
  const {
    data: roleBindingsData,
    isLoading,
    refetch,
  } = useUserRoleBindingsQuery(userID, open && userID.length > 0)
  const {
    data: accessSnapshot,
    isLoading: isAccessLoading,
  } = useUserAccessSnapshotQuery(userID, open && userID.length > 0)

  const {
    setPrimaryRoleMutation,
    addRoleBindingMutation,
    removeRoleBindingMutation,
  } = useUserMutations()

  useEffect(() => {
    if (open) {
      setPendingAddRole('')
    }
  }, [open, userID])

  const roleBindings = roleBindingsData?.roleBindings || []
  const activeRoleIDSet = useMemo(() => {
    const set = new Set<string>()
    roleBindings.forEach((binding) => {
      if ((binding.status || '').toLowerCase() === 'active') {
        set.add(binding.roleId.toLowerCase())
      }
    })
    return set
  }, [roleBindings])

  const addRoleOptions = useMemo(() => {
    return dynamicRoles
      .filter((role) => !activeRoleIDSet.has(role.id.toLowerCase()))
      .map((role) => ({
        label: role.label,
        value: role.id,
        secondaryLabel: role.id,
      }))
  }, [activeRoleIDSet, dynamicRoles])

  const anyMutationPending =
    setPrimaryRoleMutation.isPending ||
    addRoleBindingMutation.isPending ||
    removeRoleBindingMutation.isPending

  const handleSetPrimary = (roleId: string) => {
    if (!userID || !roleId) return
    setPrimaryRoleMutation.mutate(
      { id: userID, role: roleId },
      {
        onSuccess: async () => {
          await refetch()
          toast.success(t('users.toast.roleBindingPrimarySet'))
        },
      },
    )
  }

  const handleAddRoleBinding = () => {
    if (!userID) return
    if (!pendingAddRole) {
      toast.error(t('users.validation.roleRequired'))
      return
    }

    addRoleBindingMutation.mutate(
      {
        id: userID,
        payload: {
          role: pendingAddRole,
          source: 'manual',
        },
      },
      {
        onSuccess: (next) => {
          setPendingAddRole('')
          toast.success(t('users.toast.roleBindingAdded'))
          // Keep UI in sync immediately.
          if (next?.roleBindings) {
            void refetch()
          }
        },
      },
    )
  }

  const handleRemoveRoleBinding = (roleId: string) => {
    if (!userID || !roleId) return

    removeRoleBindingMutation.mutate(
      { id: userID, roleId },
      {
        onSuccess: async () => {
          await refetch()
          toast.success(t('users.toast.roleBindingRemoved'))
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl rounded-[28px] border-none p-0 overflow-hidden'>
        <DialogHeader className='p-6 bg-muted/5 border-b border-dashed border-muted/40 relative text-left'>
          <div className='absolute right-6 top-6 opacity-10 pointer-events-none'>
            <ShieldPlus className='size-10' />
          </div>
          <DialogTitle className='text-lg font-black tracking-tight uppercase'>
            {t('users.roleBindings.title')}
          </DialogTitle>
          <DialogDescription className='text-xs font-medium opacity-70'>
            {t('users.roleBindings.subtitle', { username: currentRow?.username || '-' })}
          </DialogDescription>
        </DialogHeader>

        <div className='px-6 py-5 space-y-4 max-h-[560px] overflow-y-auto'>
          <div className='grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-4'>
            <div className='space-y-2'>
              <div className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>
                {t('users.roleBindings.actions.add')}
              </div>
              <Combobox
                variant='industrial'
                value={pendingAddRole}
                onValueChange={setPendingAddRole}
                options={addRoleOptions}
                placeholder={t('users.roleBindings.placeholders.role')}
              />
            </div>
            <Button
              type='button'
              disabled={anyMutationPending || !pendingAddRole}
              onClick={handleAddRoleBinding}
              className='rounded-full h-10 px-5 text-xs font-black uppercase tracking-wide'
            >
              {t('users.roleBindings.actions.add')}
            </Button>
          </div>

          <div className='rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-4 space-y-3'>
            <div className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>
              {t('users.roleBindings.summary.title')}
            </div>
            {isAccessLoading ? (
              <div className='text-xs text-muted-foreground'>
                {t('users.roleBindings.accessLoading')}
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs'>
                <div className='space-y-1'>
                  <div className='font-semibold text-muted-foreground'>
                    {t('users.roleBindings.summary.primaryRole')}
                  </div>
                  <div className='font-mono'>
                    {accessSnapshot?.primaryRoleId || t('users.roleBindings.summary.none')}
                  </div>
                </div>
                <div className='space-y-1'>
                  <div className='font-semibold text-muted-foreground'>
                    {t('users.roleBindings.summary.permissions')}
                  </div>
                  <div className='font-mono'>
                    {String(accessSnapshot?.permissions.length || 0)}
                  </div>
                </div>
                <div className='space-y-1'>
                  <div className='font-semibold text-muted-foreground'>
                    {t('users.roleBindings.summary.effectiveRoles')}
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {(accessSnapshot?.effectiveRoles || []).length > 0 ? (
                      accessSnapshot?.effectiveRoles.map((roleId) => (
                        <Badge key={roleId} variant='outline'>
                          {roleId}
                        </Badge>
                      ))
                    ) : (
                      <span className='font-mono'>{t('users.roleBindings.summary.none')}</span>
                    )}
                  </div>
                </div>
                <div className='space-y-1'>
                  <div className='font-semibold text-muted-foreground'>
                    {t('users.roleBindings.summary.diagnostics')}
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {(accessSnapshot?.diagnostics || []).length > 0 ? (
                      accessSnapshot?.diagnostics?.map((item) => (
                        <Badge key={item} variant='secondary'>
                          {item}
                        </Badge>
                      ))
                    ) : (
                      <span className='font-mono'>{t('users.roleBindings.summary.none')}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className='space-y-2'>
            {isLoading ? (
              <div className='text-xs text-muted-foreground py-6 text-center'>
                {t('users.roleBindings.loading')}
              </div>
            ) : roleBindings.length === 0 ? (
              <div className='text-xs text-muted-foreground py-6 text-center'>
                {t('users.roleBindings.empty')}
              </div>
            ) : (
              roleBindings.map((binding) => {
                const normalizedStatus = (binding.status || '').toLowerCase()
                const isActive = normalizedStatus === 'active'
                return (
                  <div
                    key={`${binding.roleId}-${binding.bindingId || 'fallback'}`}
                    className='rounded-2xl border border-dashed border-muted/40 bg-background p-4 flex flex-col gap-3'
                  >
                    <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3'>
                      <div className='space-y-1'>
                        <div className='text-sm font-bold'>
                          {binding.roleLabel || binding.roleId}
                        </div>
                        <div className='text-xs text-muted-foreground font-mono'>
                          {binding.roleId}
                        </div>
                        <div className='flex flex-wrap items-center gap-2'>
                          <Badge variant={binding.isPrimary ? 'default' : 'secondary'}>
                            {binding.isPrimary
                              ? t('users.roleBindings.labels.primary')
                              : t('users.roleBindings.labels.secondary')}
                          </Badge>
                          <Badge variant={isActive ? 'outline' : 'secondary'}>
                            {normalizedStatus || 'active'}
                          </Badge>
                          {binding.source ? (
                            <Badge variant='outline'>{binding.source}</Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        {!binding.isPrimary ? (
                          <Button
                            type='button'
                            size='sm'
                            variant='outline'
                            disabled={anyMutationPending}
                            onClick={() => handleSetPrimary(binding.roleId)}
                          >
                            {t('users.roleBindings.actions.setPrimary')}
                          </Button>
                        ) : null}
                        {!binding.isPrimary ? (
                          <Button
                            type='button'
                            size='sm'
                            variant='destructive'
                            disabled={anyMutationPending}
                            onClick={() => handleRemoveRoleBinding(binding.roleId)}
                          >
                            {t('users.roleBindings.actions.remove')}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <DialogFooter className='p-5 border-t border-dashed border-muted/40 bg-muted/5'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='rounded-full h-10 px-5 text-xs font-black uppercase tracking-wide'
          >
            {t('common.actions.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
