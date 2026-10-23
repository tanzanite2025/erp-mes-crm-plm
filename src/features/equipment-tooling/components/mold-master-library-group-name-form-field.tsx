import { useState } from 'react'
import type { Control } from 'react-hook-form'
import { Plus, RotateCcw } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MoldFormInput, MoldFormOutput } from '../data/schema'
import { useMoldGroupsQuery } from '../hooks/use-mold-groups-query'

/** Owns group-directory states and draft entry; the mold editor owns saving. */
export function MoldMasterLibraryGroupNameFormField({
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
  const [entryMode, setEntryMode] = useState<'automatic' | 'existing' | 'new'>(
    'automatic'
  )
  const groupNamesQuery = useMoldGroupsQuery(open)
  const groupNames = groupNamesQuery.data ?? []

  return (
    <FormField
      control={control}
      name='groupName'
      render={({ field }) => {
        const isEnteringGroupName =
          entryMode === 'new' ||
          groupNames.length === 0 ||
          (entryMode === 'automatic' &&
            Boolean(field.value) &&
            !groupNames.includes(field.value ?? ''))

        return (
          <FormItem className='space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-2 px-1'>
              <FormLabel className='text-xs font-medium text-foreground'>
                {t('equipmentTooling.molds.dialog.fields.group')}
              </FormLabel>
              {groupNames.length > 0 && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-8 gap-1 rounded-full px-3 text-xs'
                  onClick={() => {
                    if (isEnteringGroupName) {
                      setEntryMode('existing')
                      if (!groupNames.includes(field.value ?? '')) {
                        field.onChange('')
                      }
                    } else {
                      setEntryMode('new')
                      field.onChange('')
                    }
                  }}
                >
                  {isEnteringGroupName ? (
                    <>
                      <RotateCcw className='size-2.5' />{' '}
                      {t('equipmentTooling.molds.dialog.actions.useChooser')}
                    </>
                  ) : (
                    <>
                      <Plus className='size-2.5' />{' '}
                      {t('equipmentTooling.molds.dialog.actions.newGroup')}
                    </>
                  )}
                </Button>
              )}
            </div>
            {isEnteringGroupName ? (
              <FormControl>
                <Input
                  maxLength={100}
                  className={inputClassName}
                  placeholder={t(
                    'equipmentTooling.molds.dialog.placeholders.newGroup'
                  )}
                  {...field}
                  value={field.value ?? ''}
                  onChange={(event) => {
                    setEntryMode('new')
                    field.onChange(event)
                  }}
                  autoFocus={entryMode === 'new'}
                />
              </FormControl>
            ) : (
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger className={inputClassName}>
                    <SelectValue
                      placeholder={t(
                        'equipmentTooling.molds.dialog.placeholders.selectRegistry'
                      )}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className='mold-master-library-floating-surface rounded-xl'>
                  {groupNames.map((groupName) => (
                    <SelectItem
                      key={groupName}
                      value={groupName}
                      className='text-[13px]'
                    >
                      {groupName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {groupNamesQuery.isPending ? (
              <p
                role='status'
                className='text-xs leading-5 text-muted-foreground'
              >
                {isChineseLocale
                  ? '正在读取已有模具分组，也可直接填写新组名。'
                  : 'Loading existing mold groups. You can also enter a new group name.'}
              </p>
            ) : groupNamesQuery.isError ? (
              <div role='alert' className='space-y-2 text-xs leading-5'>
                <p className='text-destructive'>
                  {isChineseLocale
                    ? '已有模具分组读取失败，可重新读取；已填写的组名会保留。'
                    : 'Cannot load existing mold groups. Retry loading; your entered group name is retained.'}
                </p>
                <Button
                  type='button'
                  variant='outline'
                  className='h-8 rounded-full text-xs'
                  disabled={groupNamesQuery.isFetching}
                  onClick={() => void groupNamesQuery.refetch()}
                >
                  {isChineseLocale ? '重新读取分组' : 'Reload groups'}
                </Button>
              </div>
            ) : groupNames.length === 0 ? (
              <p
                role='status'
                className='text-xs leading-5 text-muted-foreground'
              >
                {isChineseLocale
                  ? '暂无已有分组，可直接填写新组名，随模具一起保存。'
                  : 'No existing groups. Enter a new group name to save with the mold.'}
              </p>
            ) : null}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
