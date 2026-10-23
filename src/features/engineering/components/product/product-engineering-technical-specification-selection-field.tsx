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
import { TechnicalSpecificationDocumentLibrarySelectionDialog } from '@/features/engineering-db/components/technical-specification-document-library-selection-dialog'
import { TechnicalSpecificationDocumentPreviewDialog } from '@/features/engineering-db/components/technical-specification-document-preview-dialog'
import { productFormTypographyClassNames } from './product-form-typography.styles'

export function ProductEngineeringTechnicalSpecificationSelectionField({
  value,
  onValueChange,
  options,
}: {
  value?: string
  onValueChange: (id: string) => void
  options: { label: string; value: string }[]
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
                      ? '当前规范待核对'
                      : 'Verify current specification'
                    : isChineseLocale
                      ? '选择工艺规范…'
                      : 'Select specification…')}
              </span>
              <ChevronDown className='size-4 shrink-0 text-muted-foreground' />
            </button>
          </FormControl>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='start'
          className='engineering-technical-specification-document-floating-surface z-125 w-80 max-w-[calc(100vw-2rem)] rounded-xl'
        >
          <div className='max-h-52 overflow-y-auto'>
            {options.length ? (
              options.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => onValueChange(option.value)}
                  className='text-[13px]'
                >
                  <Check
                    className={cn(
                      'size-4',
                      option.value !== value && 'invisible'
                    )}
                  />
                  <span className='min-w-0 break-words'>{option.label}</span>
                </DropdownMenuItem>
              ))
            ) : (
              <p className='px-3 py-2 text-xs leading-5 text-muted-foreground'>
                {isChineseLocale
                  ? '暂无可选规范，可打开主库查看或新增。'
                  : 'No specifications available. Open the library to view or create one.'}
              </p>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!value}
            onSelect={() => setIsPreviewOpen(true)}
            className='text-[13px]'
          >
            <Eye className='size-4' />
            {isChineseLocale
              ? '查看当前工艺规范'
              : 'View current specification'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setIsLibraryOpen(true)}
            className='text-[13px] font-semibold text-blue-600 dark:text-blue-400'
          >
            <LibraryBig className='size-4' />
            {isChineseLocale
              ? '从主库查看、选择或新增…'
              : 'View, select or create in master library…'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isLibraryOpen && (
        <TechnicalSpecificationDocumentLibrarySelectionDialog
          value={value}
          onClose={() => setIsLibraryOpen(false)}
          onSelect={(specification) => {
            onValueChange(specification.id)
            setIsLibraryOpen(false)
          }}
        />
      )}
      {isPreviewOpen && value && (
        <TechnicalSpecificationDocumentPreviewDialog
          specificationId={value}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </>
  )
}
