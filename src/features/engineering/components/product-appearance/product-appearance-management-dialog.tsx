import { useIsMutating } from '@tanstack/react-query'
import { Palette } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { PRODUCT_APPEARANCES_QUERY_KEY } from '../../query-keys'
import {
  ProductAppearanceManagementPanel,
  type ProductAppearanceManagementPanelProps,
} from './product-appearance-management-panel'

export interface ProductAppearanceManagementDialogProps extends ProductAppearanceManagementPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const productAppearanceManagementDialogClasses = buildActionDialogShellClasses({
  content:
    'flex max-h-[90dvh] flex-col gap-0 rounded-[24px] sm:max-w-6xl sm:rounded-[32px] [&_[data-slot=button]]:rounded-full [&_[data-slot=dialog-close]]:rounded-full',
  header: 'border-muted/50 px-5 py-5 pr-12 text-start sm:px-6 sm:pr-12',
  title: 'flex items-center gap-2.5 text-base text-primary sm:text-lg',
  description:
    'text-[11px] leading-relaxed font-medium tracking-normal normal-case opacity-80',
  body: 'min-h-0 flex-1 overflow-y-auto p-5 sm:p-6',
  footer: 'shrink-0 flex-row justify-end border-muted/50 px-5 py-4 sm:px-6',
})

export function ProductAppearanceManagementDialog({
  open,
  onOpenChange,
  onAppearanceSelected,
  ...panelProps
}: ProductAppearanceManagementDialogProps) {
  const { t } = useLanguage()
  const isUpdatingCatalog =
    useIsMutating({ mutationKey: PRODUCT_APPEARANCES_QUERY_KEY }) > 0
  function handleProductAppearanceManagementDialogOpenChange(
    nextOpen: boolean
  ) {
    if (!isUpdatingCatalog) onOpenChange(nextOpen)
  }
  return (
    <ActionDialogShell
      open={open}
      onOpenChange={handleProductAppearanceManagementDialogOpenChange}
      title={
        <>
          <Palette className='size-5 text-blue-600' />
          {t('engineering.productAppearance.dialog.managementTitle')}
        </>
      }
      description={t(
        'engineering.productAppearance.dialog.managementDescription'
      )}
      contentClassName={productAppearanceManagementDialogClasses.content}
      headerClassName={productAppearanceManagementDialogClasses.header}
      titleClassName={productAppearanceManagementDialogClasses.title}
      descriptionClassName={
        productAppearanceManagementDialogClasses.description
      }
      bodyClassName={productAppearanceManagementDialogClasses.body}
      footerClassName={productAppearanceManagementDialogClasses.footer}
      footer={
        <Button
          type='button'
          disabled={isUpdatingCatalog}
          className='h-11 rounded-full bg-blue-600 px-8 text-[11px] font-black text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700'
          onClick={() =>
            handleProductAppearanceManagementDialogOpenChange(false)
          }
        >
          {t('engineering.productAppearance.actions.done')}
        </Button>
      }
    >
      {open && (
        <ProductAppearanceManagementPanel
          {...panelProps}
          onAppearanceSelected={
            onAppearanceSelected
              ? (appearance) => {
                  onAppearanceSelected(appearance)
                  onOpenChange(false)
                }
              : undefined
          }
        />
      )}
    </ActionDialogShell>
  )
}
