'use client'

import { ShieldPlus } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type User } from '../data/schema'
import { useUserPermissionEditor } from '../hooks/use-user-permission-editor'
import { UserPermissionToolbar } from './user-permission-toolbar'
import { UserPermissionTree } from './user-permission-tree'

type UsersPermissionsDialogProps = {
  currentRow?: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersPermissionsDialog({
  currentRow,
  open,
  onOpenChange,
}: UsersPermissionsDialogProps) {
  const { t } = useLanguage()
  const editor = useUserPermissionEditor({ currentRow, open })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) editor.resetEditor()
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        closeButtonClassName='end-3 top-3 flex size-9 items-center justify-center rounded-full border border-dashed border-muted/40 bg-background/85 text-muted-foreground/70 opacity-100 shadow-sm backdrop-blur-sm transition-all hover:bg-muted/80 hover:text-foreground active:scale-95 focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 data-[state=open]:bg-background/85 data-[state=open]:text-muted-foreground/70 sm:end-4 sm:top-4 sm:size-10'
        className='top-0 left-0 h-svh max-h-svh w-screen max-w-screen translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-t-[32px] rounded-b-none border-none p-0 shadow-2xl sm:top-[50%] sm:left-[50%] sm:h-[calc(100svh-2rem)] sm:max-h-[calc(100svh-2rem)] sm:w-[96vw] sm:max-w-[1500px] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[32px]'
      >
        <DialogHeader className='border-b border-dashed border-muted/40 bg-muted/5 px-4 py-3 pe-12 text-left sm:px-6 sm:pe-16'>
          <div className='flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <div className='min-w-0'>
              <DialogTitle className='flex items-center gap-2 text-base font-black tracking-tighter uppercase italic sm:text-lg'>
                <ShieldPlus
                  className='size-4 text-primary'
                  aria-hidden='true'
                />
                {t('users.permissionAssignments.title')}
              </DialogTitle>
              <DialogDescription className='mt-1 text-[9px] font-black tracking-[0.12em] uppercase opacity-60 sm:text-[10px] sm:tracking-widest'>
                {t('users.permissionAssignments.subtitle', {
                  username: editor.username,
                })}
              </DialogDescription>
            </div>
            <div className='grid w-full shrink-0 grid-cols-[1.35fr_1fr] gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end'>
              <Button
                type='button'
                variant='outline'
                className='h-10 min-w-0 rounded-full px-2 text-[9px] font-black tracking-tight whitespace-nowrap shadow-sm transition-all active:scale-95 sm:h-9 sm:px-4 sm:text-[10px] sm:tracking-widest'
                onClick={editor.resetDraft}
                disabled={
                  editor.anyMutationPending || !editor.hasUnsavedChanges
                }
              >
                {t('users.permissionAssignments.actions.reset')}
              </Button>
              <Button
                type='button'
                className='h-10 min-w-0 rounded-full px-2 text-[9px] font-black tracking-tight whitespace-nowrap shadow-sm transition-all active:scale-95 sm:h-9 sm:px-4 sm:text-[10px] sm:tracking-widest'
                onClick={editor.save}
                disabled={
                  editor.anyMutationPending || !editor.hasUnsavedChanges
                }
              >
                {t('users.permissionAssignments.actions.save')}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className='min-h-0 overflow-y-auto overscroll-contain px-3 pt-3 pb-3 sm:px-5 sm:pb-4 xl:overflow-hidden'>
          <div className='grid h-full grid-cols-1 gap-3'>
            <div className='space-y-3 xl:flex xl:min-h-0 xl:flex-col'>
              <UserPermissionToolbar
                role={editor.role}
                inheritedPermissionCount={editor.inheritedPermissionIDSet.size}
                effectivePermissionCount={editor.effectivePermissionIDSet.size}
                search={editor.search}
                allPermissionsSelected={editor.allPermissionsSelected}
                canSelectPermissions={editor.allPermissionIDs.length > 0}
                onSearchChange={editor.setSearch}
                onSelectAll={editor.selectAll}
                onClearAll={editor.clearAll}
                onExpandAll={editor.expandAll}
                onCollapseAll={editor.collapseAll}
              />
              <UserPermissionTree
                columns={editor.visibleTreeColumns}
                visibleTreeCount={editor.visibleTreeCount}
                isLoading={editor.isLoading}
                expandedModuleIDs={editor.expandedModuleIDs}
                effectivePermissionIDSet={editor.effectivePermissionIDSet}
                inheritedPermissionIDSet={editor.inheritedPermissionIDSet}
                onToggleModule={editor.toggleModuleExpanded}
                onTogglePermissionIDs={editor.togglePermissionIDs}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
