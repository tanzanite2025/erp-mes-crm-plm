import { useCallback, useEffect, useRef } from 'react'
import { UsersActionDialog } from './users-action-dialog'
import { UsersDeleteDialog } from './users-delete-dialog'
import { UsersPermissionsDialog } from './users-permissions-dialog'
import { useUsers } from './users-provider'

export function UsersDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useUsers()
  const resetTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)

  const scheduleRowReset = useCallback(() => {
    if (resetTimerRef.current) {
      globalThis.clearTimeout(resetTimerRef.current)
    }

    resetTimerRef.current = globalThis.setTimeout(() => {
      setCurrentRow(null)
      resetTimerRef.current = null
    }, 500)
  }, [setCurrentRow])

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        globalThis.clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  const handleManagedDialogOpenChange = useCallback((dialog: 'edit' | 'permissions' | 'delete', nextOpen: boolean) => {
    setOpen(dialog)
    if (!nextOpen) {
      scheduleRowReset()
    }
  }, [scheduleRowReset, setOpen])

  return (
    <>
      <UsersActionDialog
        key='user-add'
        open={open === 'add'}
        onOpenChange={() => setOpen('add')}
      />

      {currentRow && (
        <>
          <UsersActionDialog
            key={`user-edit-${currentRow.id}`}
            open={open === 'edit'}
            onOpenChange={(nextOpen) => handleManagedDialogOpenChange('edit', nextOpen)}
            currentRow={currentRow}
          />

          <UsersPermissionsDialog
            key={`user-permissions-${currentRow.id}`}
            open={open === 'permissions'}
            onOpenChange={(nextOpen) => handleManagedDialogOpenChange('permissions', nextOpen)}
            currentRow={currentRow}
          />

          <UsersDeleteDialog
            key={`user-delete-${currentRow.id}`}
            open={open === 'delete'}
            onOpenChange={(nextOpen) => handleManagedDialogOpenChange('delete', nextOpen)}
            currentRow={currentRow}
          />
        </>
      )}
    </>
  )
}
