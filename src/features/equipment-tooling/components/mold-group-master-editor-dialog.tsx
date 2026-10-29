import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { usePermissionBoundary } from '@/features/authz/hooks/use-permission-access'
import type { MoldGroupMasterRecord } from '../data/mold-group-master-schema'
import { invalidateMoldMasterLibraryQueriesAfterWrite } from '../queries/invalidate-mold-master-library-queries-after-write'
import { MoldGroupMasterService } from '../services/mold-group-master-service'

export function MoldGroupMasterEditorDialog({
  group,
  onClose,
  onSaved,
}: {
  group?: MoldGroupMasterRecord
  onClose: () => void
  onSaved?: (group: MoldGroupMasterRecord) => void
}) {
  const { locale } = useLanguage()
  const isChineseLocale = locale.startsWith('zh')
  const managePermission = usePermissionBoundary('action_equipment_mold_manage')
  const queryClient = useQueryClient()
  const [name, setName] = useState(group?.name ?? '')
  const [description, setDescription] = useState(group?.description ?? '')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const submissionLock = useRef(false)

  useEffect(() => {
    setName(group?.name ?? '')
    setDescription(group?.description ?? '')
    setErrorMessage('')
  }, [group])

  async function saveMoldGroupMasterFromEditor() {
    if (submissionLock.current || !managePermission.isAllowed) return
    if (!name.trim()) {
      setErrorMessage(isChineseLocale ? '请输入分组名称' : 'Enter a group name')
      return
    }
    submissionLock.current = true
    setIsSaving(true)
    setErrorMessage('')
    try {
      const saved = await MoldGroupMasterService.saveMoldGroup(
        {
          name: name.trim(),
          description: description.trim(),
          active: group?.active ?? true,
          version: group?.version ?? 1,
        },
        group?.id
      )
      await invalidateMoldMasterLibraryQueriesAfterWrite(queryClient)
      onSaved?.(saved)
      onClose()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isChineseLocale
            ? '分组保存失败，请重试'
            : 'Cannot save the group. Please retry.'
      )
    } finally {
      submissionLock.current = false
      setIsSaving(false)
    }
  }

  return (
    <ActionDialogShell
      open
      onOpenChange={(open) => {
        if (!open && !submissionLock.current) onClose()
      }}
      title={
        isChineseLocale
          ? group
            ? '编辑模具分组'
            : '新建模具分组'
          : group
            ? 'Edit mold group'
            : 'Create mold group'
      }
      description={
        isChineseLocale
          ? '分组独立保存，可供模具和产品共同选用。修改名称会同步显示在已有引用中。'
          : 'Groups are saved independently and shared by molds and products. Renaming preserves existing links.'
      }
      contentClassName='mold-master-library-floating-surface max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-xl [&_[data-slot=button]]:rounded-full'
      footer={
        <>
          <Button
            type='button'
            variant='ghost'
            disabled={isSaving}
            onClick={onClose}
          >
            {isChineseLocale ? '取消' : 'Cancel'}
          </Button>
          <Button
            type='submit'
            form='mold-group-master-editor-form'
            disabled={isSaving || !managePermission.isAllowed}
          >
            {isSaving
              ? isChineseLocale
                ? '正在保存…'
                : 'Saving…'
              : isChineseLocale
                ? '保存分组'
                : 'Save group'}
          </Button>
        </>
      }
    >
      <form
        id='mold-group-master-editor-form'
        className='space-y-4 py-2'
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void saveMoldGroupMasterFromEditor()
        }}
      >
        <fieldset disabled={isSaving} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='mold-group-master-name'>
              {isChineseLocale ? '分组名称' : 'Group name'}
            </Label>
            <Input
              id='mold-group-master-name'
              autoFocus
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='mold-group-master-description'>
              {isChineseLocale ? '分组说明' : 'Description'}
            </Label>
            <Textarea
              id='mold-group-master-description'
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          {errorMessage && (
            <p role='alert' className='text-sm text-destructive'>
              {errorMessage}
            </p>
          )}
        </fieldset>
      </form>
    </ActionDialogShell>
  )
}
