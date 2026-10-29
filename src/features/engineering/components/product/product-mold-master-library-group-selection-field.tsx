import { useState } from 'react'
import { Check, ChevronDown, Eye, LibraryBig } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FormControl } from '@/components/ui/form'
import { MoldGroupMasterLibrarySelectionDialog } from '@/features/equipment-tooling/components/mold-group-master-library-selection-dialog'
import { MoldMasterLibraryGroupPreviewDialog } from '@/features/equipment-tooling/components/mold-master-library-group-preview-dialog'
import { productFormTypographyClassNames } from './product-form-typography.styles'

export function ProductMoldMasterLibraryGroupSelectionField({
  value,
  onValueChange,
  options,
}: {
  value?: string
  onValueChange: (groupId: string, groupName: string) => void
  options: { label: string; value: string; active?: boolean }[]
}) {
  const { locale } = useLanguage()
  const isChineseLocale = locale.startsWith('zh')
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const label = options.find((option) => option.value === value)?.label
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <FormControl>
            <button
              type='button'
              className={cn(
                'flex h-[38px] w-full items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 text-start',
                productFormTypographyClassNames.control
              )}
            >
              <span
                className={cn(
                  'min-w-0 truncate',
                  !label && 'text-muted-foreground'
                )}
              >
                {label ||
                  (value
                    ? isChineseLocale
                      ? '原分组已不可用'
                      : 'Previous group unavailable'
                    : '') ||
                  (isChineseLocale ? '选择模具分组…' : 'Select mold group…')}
              </span>
              <ChevronDown className='size-4 shrink-0 text-muted-foreground' />
            </button>
          </FormControl>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='start'
          className='mold-master-library-floating-surface z-125 w-80 max-w-[calc(100vw-2rem)] rounded-xl'
        >
          <div className='max-h-52 overflow-y-auto'>
            {options.length ? (
              options
                .filter(
                  (option) => option.active !== false || option.value === value
                )
                .map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    disabled={option.active === false}
                    onSelect={() => onValueChange(option.value, option.label)}
                    className='text-[13px]'
                  >
                    <Check
                      className={cn(
                        'size-4',
                        option.value !== value && 'invisible'
                      )}
                    />
                    <span className='min-w-0 break-words'>
                      {option.label}
                      {option.active === false
                        ? isChineseLocale
                          ? '（已停用）'
                          : ' (inactive)'
                        : ''}
                    </span>
                  </DropdownMenuItem>
                ))
            ) : (
              <p className='px-3 py-2 text-xs leading-5 text-muted-foreground'>
                {isChineseLocale
                  ? '暂无可选分组，可打开模具主库查看或新增。'
                  : 'No groups available. Open the mold library to view or create one.'}
              </p>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!value}
            onSelect={() => onValueChange('', '')}
          >
            {isChineseLocale ? '清除模具分组关联' : 'Clear mold group link'}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!value}
            onSelect={() => setIsPreviewOpen(true)}
            className='text-[13px]'
          >
            <Eye className='size-4' />
            {isChineseLocale
              ? '查看当前分组内模具'
              : 'View molds in the current group'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setIsLibraryOpen(true)}
            className='text-[13px] font-semibold text-blue-600 dark:text-blue-400'
          >
            <LibraryBig className='size-4' />
            {isChineseLocale
              ? '从模具主库查看、选择或新增…'
              : 'View, select or create in mold library…'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isLibraryOpen && (
        <MoldGroupMasterLibrarySelectionDialog
          value={value}
          onClose={() => setIsLibraryOpen(false)}
          onSelect={(groupId, groupName) => {
            onValueChange(groupId, groupName)
            setIsLibraryOpen(false)
          }}
        />
      )}
      {isPreviewOpen && value && (
        <MoldMasterLibraryGroupPreviewDialog
          groupId={value}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  )
}
