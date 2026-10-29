import { useState } from 'react'
import { type Control, useFormContext } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePermissionBoundary } from '@/features/authz/hooks/use-permission-access'
import type { MoldFormInput, MoldFormOutput } from '../data/schema'
import { createMoldGroupMasterDirectoryQueryOptions } from '../queries/mold-group-master-directory-query-options'
import { MoldGroupMasterEditorDialog } from './mold-group-master-editor-dialog'
import { MoldGroupMasterManagementDialog } from './mold-group-master-management-dialog'

export function MoldGroupMasterSelectionFormField({
  control,
  open,
  inputClassName,
}: {
  control: Control<MoldFormInput, unknown, MoldFormOutput>
  open: boolean
  inputClassName: string
}) {
  const { t, locale } = useLanguage()
  const isChineseLocale = locale.startsWith('zh')
  const managePermission = usePermissionBoundary('action_equipment_mold_manage')
  const form = useFormContext<MoldFormInput, unknown, MoldFormOutput>()
  const groupsQuery = useQuery({
    ...createMoldGroupMasterDirectoryQueryOptions(),
    enabled: open,
  })
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [isManagingGroups, setIsManagingGroups] = useState(false)

  return (
    <>
      <FormField
        control={control}
        name='groupId'
        render={({ field }) => (
          <FormItem className='space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <FormLabel className='text-xs font-medium'>
                {t('equipmentTooling.molds.dialog.fields.group')}
              </FormLabel>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  className='rounded-full'
                  disabled={!managePermission.isAllowed}
                  onClick={() => setIsManagingGroups(true)}
                >
                  {isChineseLocale ? '管理分组' : 'Manage groups'}
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='rounded-full'
                  disabled={!managePermission.isAllowed}
                  onClick={() => setIsCreatingGroup(true)}
                >
                  {isChineseLocale ? '新建分组' : 'Create group'}
                </Button>
              </div>
            </div>
            <Select
              disabled={groupsQuery.isPending || groupsQuery.isError}
              value={field.value || '__ungrouped__'}
              onValueChange={(value) => {
                const selected = groupsQuery.data?.find(
                  (group) => group.id === value
                )
                // The native select bridge can emit an empty value while Radix
                // refreshes its options. Only the explicit unassigned item clears.
                if (!selected && value !== '__ungrouped__') return
                field.onChange(selected?.id ?? '')
                form.setValue('groupName', selected?.name ?? '', {
                  shouldDirty: true,
                })
              }}
            >
              <FormControl>
                <SelectTrigger className={inputClassName}>
                  <SelectValue
                    placeholder={
                      isChineseLocale ? '请选择所属分组' : 'Select a group'
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent className='mold-master-library-floating-surface'>
                <SelectItem value='__ungrouped__'>
                  {isChineseLocale ? '暂不分组' : 'Unassigned'}
                </SelectItem>
                {(groupsQuery.data ?? [])
                  .filter((group) => group.active || group.id === field.value)
                  .map((group) => (
                    <SelectItem
                      key={group.id}
                      value={group.id}
                      disabled={!group.active}
                    >
                      {group.name}
                      {!group.active
                        ? isChineseLocale
                          ? '（已停用）'
                          : ' (inactive)'
                        : ''}
                    </SelectItem>
                  ))}
                {field.value &&
                  !groupsQuery.data?.some(
                    (group) => group.id === field.value
                  ) && (
                    <SelectItem value={field.value} disabled>
                      {isChineseLocale
                        ? '原分组已不可用，请重新选择'
                        : 'Previous group unavailable; choose again'}
                    </SelectItem>
                  )}
              </SelectContent>
            </Select>
            {groupsQuery.isPending ? (
              <p role='status' className='text-xs text-muted-foreground'>
                {isChineseLocale ? '正在读取模具分组…' : 'Loading mold groups…'}
              </p>
            ) : groupsQuery.isError ? (
              <div role='alert' className='space-y-2 text-xs text-destructive'>
                <p>
                  {isChineseLocale
                    ? '分组读取失败，请重新读取。'
                    : 'Cannot load groups. Please retry.'}
                </p>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='rounded-full'
                  disabled={groupsQuery.isFetching}
                  onClick={() => void groupsQuery.refetch()}
                >
                  {isChineseLocale ? '重新读取分组' : 'Reload groups'}
                </Button>
              </div>
            ) : (
              <p className='text-xs leading-5 text-muted-foreground'>
                {isChineseLocale
                  ? '选择统一维护的分组；暂无分组时，可先新建分组再选择。'
                  : 'Choose a group from the shared directory, or create one first.'}
              </p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      {isCreatingGroup && (
        <MoldGroupMasterEditorDialog
          onClose={() => setIsCreatingGroup(false)}
          onSaved={(group) => {
            form.setValue('groupId', group.id, {
              shouldDirty: true,
              shouldValidate: true,
            })
            form.setValue('groupName', group.name, { shouldDirty: true })
          }}
        />
      )}
      {isManagingGroups && (
        <MoldGroupMasterManagementDialog
          onClose={() => setIsManagingGroups(false)}
        />
      )}
    </>
  )
}
