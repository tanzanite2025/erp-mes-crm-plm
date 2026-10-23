'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Hash,
  ImageIcon,
  Palette,
  Pencil,
  Plus,
  Rows3,
  Trash2,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  resolveProductAppearanceImageSource,
  type ProductAppearance,
} from '../../data/product-appearance'
import { useProductAppearanceCatalogQueries } from '../../hooks/use-product-appearance-catalog-queries'
import { useProductAppearanceWriteActions } from '../../hooks/use-product-appearance-write-actions'
import { ProductAppearanceCatalogRequestState } from './product-appearance-catalog-request-state'
import { ProductAppearanceEditorDialog } from './product-appearance-editor-dialog'

const EMPTY_PRODUCT_APPEARANCE_CATALOG: ProductAppearance[] = []

export interface ProductAppearanceManagementPanelProps {
  onAppearanceSaved?: (appearance: ProductAppearance) => void
  onAppearanceSelected?: (appearance: ProductAppearance) => void
  onAppearanceDeleted?: (id: string) => void
}

export function ProductAppearanceManagementPanel({
  onAppearanceSaved,
  onAppearanceSelected,
  onAppearanceDeleted,
}: ProductAppearanceManagementPanelProps) {
  const { t } = useLanguage()
  const catalog = useProductAppearanceCatalogQueries()
  const {
    saveAppearance,
    deleteAppearance,
    isSavingAppearance,
    isDeletingAppearance,
  } = useProductAppearanceWriteActions()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingAppearance, setEditingAppearance] = useState<
    ProductAppearance | undefined
  >()
  const actionInProgressRef = useRef(false)
  const appearances = catalog.data ?? EMPTY_PRODUCT_APPEARANCE_CATALOG
  const activeCount = useMemo(
    () => appearances.filter((item) => item.active).length,
    [appearances]
  )
  const usedCodes = useMemo(
    () =>
      new Set(appearances.map((item) => item.barcodeCode).filter(Boolean)).size,
    [appearances]
  )
  const isUpdatingCatalog = isSavingAppearance || isDeletingAppearance

  function openProductAppearanceCreateDialog() {
    setEditingAppearance(undefined)
    setEditorOpen(true)
  }

  function openProductAppearanceEditDialog(appearance: ProductAppearance) {
    setEditingAppearance(appearance)
    setEditorOpen(true)
  }

  async function deleteProductAppearanceFromManagementPanel(
    appearance: ProductAppearance
  ) {
    if (
      actionInProgressRef.current ||
      !(await requestApplicationConfirmation(
        t('engineering.productAppearance.actions.deleteConfirm', {
          name: appearance.name,
        })
      ))
    )
      return
    actionInProgressRef.current = true
    try {
      await deleteAppearance(appearance.id)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('engineering.productAppearance.toasts.deleteFailed')
      )
      return
    } finally {
      actionInProgressRef.current = false
    }
    toast.success(t('engineering.productAppearance.toasts.deleteSuccess'))
    onAppearanceDeleted?.(appearance.id)
  }

  async function changeProductAppearanceActiveStatus(
    appearance: ProductAppearance,
    active: boolean
  ) {
    if (actionInProgressRef.current) return
    actionInProgressRef.current = true
    let savedAppearance: ProductAppearance
    try {
      savedAppearance = await saveAppearance({
        draft: { ...appearance, active },
        current: appearance,
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('engineering.productAppearance.toasts.saveFailed')
      )
      return
    } finally {
      actionInProgressRef.current = false
    }
    onAppearanceSaved?.(savedAppearance)
  }

  const requestState = (
    <ProductAppearanceCatalogRequestState
      isLoading={catalog.isPending}
      error={catalog.error}
      onRetry={() => void catalog.refetch()}
    />
  )
  if (!catalog.data) return requestState

  return (
    <div className='flex flex-col gap-5 lg:gap-6'>
      {requestState}
      <div className='flex flex-col gap-3 rounded-[28px] border border-dashed border-muted/50 bg-muted/5 p-3 md:p-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2.5 text-primary'>
              <Palette className='size-4' />
              <h3 className='text-base font-black tracking-tighter uppercase md:text-lg'>
                {t('engineering.productAppearance.title')}
              </h3>
            </div>
            <p className='max-w-3xl text-[11px] leading-5 text-muted-foreground'>
              {t('engineering.productAppearance.description')}
            </p>
          </div>
          <Button
            className='h-10 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
            disabled={isUpdatingCatalog}
            onClick={openProductAppearanceCreateDialog}
          >
            <Plus className='mr-2 size-4' />
            {t('engineering.productAppearance.actions.add')}
          </Button>
        </div>
      </div>

      <div className='grid gap-3 md:grid-cols-3'>
        <Card className='gap-3 border-none bg-muted/30 py-4 shadow-sm'>
          <CardContent className='flex items-center gap-3 px-4'>
            <div className='rounded-2xl bg-primary/10 p-2.5 text-primary'>
              <Palette className='size-4' />
            </div>
            <div>
              <div className='text-[10px] font-bold text-muted-foreground'>
                {t('engineering.productAppearance.metrics.total')}
              </div>
              <div className='text-xl leading-none font-black'>
                {appearances.length}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className='gap-3 border-none bg-muted/30 py-4 shadow-sm'>
          <CardContent className='flex items-center gap-3 px-4'>
            <div className='rounded-2xl bg-emerald-500/10 p-2.5 text-emerald-600'>
              <Hash className='size-4' />
            </div>
            <div>
              <div className='text-[10px] font-bold text-muted-foreground'>
                {t('engineering.productAppearance.metrics.codes')}
              </div>
              <div className='text-xl leading-none font-black'>{usedCodes}</div>
            </div>
          </CardContent>
        </Card>
        <Card className='gap-3 border-none bg-muted/30 py-4 shadow-sm'>
          <CardContent className='flex items-center gap-3 px-4'>
            <div className='rounded-2xl bg-blue-500/10 p-2.5 text-blue-600'>
              <Rows3 className='size-4' />
            </div>
            <div>
              <div className='text-[10px] font-bold text-muted-foreground'>
                {t('engineering.productAppearance.metrics.active')}
              </div>
              <div className='text-xl leading-none font-black'>
                {activeCount}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {appearances.length === 0 ? (
        <Card className='border-dashed'>
          <CardContent className='flex flex-col items-center justify-center gap-3 py-12 text-center'>
            <Palette className='size-10 text-muted-foreground/40' />
            <div className='space-y-1'>
              <h4 className='text-base font-black'>
                {t('engineering.productAppearance.empty.title')}
              </h4>
              <p className='text-sm text-muted-foreground'>
                {t('engineering.productAppearance.empty.description')}
              </p>
            </div>
            <Button
              variant='outline'
              className='rounded-full'
              disabled={isUpdatingCatalog}
              onClick={openProductAppearanceCreateDialog}
            >
              <Plus className='mr-2 size-4' />
              {t('engineering.productAppearance.actions.add')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-2.5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'>
          {appearances.map((row) => (
            <Card
              key={row.id}
              role='article'
              aria-label={row.name}
              className='gap-2 border-none py-3 shadow-sm'
            >
              <CardContent className='space-y-2 px-3.5'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex min-w-0 flex-1 gap-2.5'>
                    <div className='flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-muted/20'>
                      {row.imageThumbnailUrl ? (
                        <img
                          src={resolveProductAppearanceImageSource(
                            row.imageThumbnailUrl
                          )}
                          alt={row.name}
                          className='size-full object-cover'
                        />
                      ) : (
                        <ImageIcon className='size-4 text-muted-foreground/20' />
                      )}
                    </div>
                    <div className='min-w-0 flex-1 space-y-1'>
                      <div className='flex items-center gap-1.5'>
                        <CardTitle className='truncate text-sm leading-none font-black'>
                          {row.name}
                        </CardTitle>
                        <Badge
                          variant='outline'
                          className='h-5 px-1.5 text-[10px]'
                        >
                          {row.barcodeCode}
                        </Badge>
                      </div>
                      <div className='flex flex-wrap items-center gap-1.5'>
                        <Badge
                          className={
                            row.active
                              ? 'h-5 bg-emerald-500/10 px-1.5 text-[10px] text-emerald-600'
                              : 'h-5 bg-slate-500/10 px-1.5 text-[10px] text-slate-500'
                          }
                        >
                          {row.active
                            ? t('engineering.productAppearance.badges.active')
                            : t(
                                'engineering.productAppearance.badges.inactive'
                              )}
                        </Badge>
                        <Badge
                          variant='secondary'
                          className='h-5 px-1.5 text-[10px]'
                        >
                          {t('engineering.productAppearance.fields.sortOrder')}:{' '}
                          {row.sortOrder}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-2 rounded-lg border bg-muted/15 px-2 py-1'>
                    <div className='text-[10px] font-bold text-muted-foreground'>
                      {t('engineering.productAppearance.fields.active')}
                    </div>
                    <Switch
                      aria-label={`${t('engineering.productAppearance.fields.active')} · ${row.name}`}
                      disabled={isUpdatingCatalog}
                      checked={row.active}
                      onCheckedChange={(checked) =>
                        void changeProductAppearanceActiveStatus(row, checked)
                      }
                    />
                  </div>
                </div>
                <div className='grid grid-cols-[auto_1fr] items-start gap-x-2 text-[10px] leading-4 text-muted-foreground'>
                  <div className='font-bold'>
                    {t('engineering.productAppearance.fields.description')}
                  </div>
                  <div className='truncate'>
                    {row.description ||
                      t(
                        'engineering.productAppearance.empty.descriptionFallback'
                      )}
                  </div>
                </div>
                <div className='flex items-center justify-end gap-1.5 border-t pt-2'>
                  {onAppearanceSelected && (
                    <Button
                      type='button'
                      size='sm'
                      className='mr-auto h-7 rounded-full px-3 text-[10px] font-black'
                      disabled={!row.active || isUpdatingCatalog}
                      onClick={() => onAppearanceSelected(row)}
                    >
                      <Check className='size-3' />
                      {t('engineering.productAppearance.actions.select')}
                    </Button>
                  )}
                  <Button
                    aria-label={`${t('engineering.productAppearance.actions.edit')} · ${row.name}`}
                    disabled={isUpdatingCatalog}
                    variant='outline'
                    size='sm'
                    className='h-7 rounded-full px-2.5 text-[10px] font-black'
                    onClick={() => openProductAppearanceEditDialog(row)}
                  >
                    <Pencil className='mr-1.5 size-3' />
                    {t('engineering.productAppearance.actions.edit')}
                  </Button>
                  <Button
                    aria-label={`${t('engineering.productAppearance.actions.delete')} · ${row.name}`}
                    disabled={isUpdatingCatalog}
                    variant='outline'
                    size='sm'
                    className='h-7 rounded-full px-2.5 text-[10px]'
                    onClick={() =>
                      void deleteProductAppearanceFromManagementPanel(row)
                    }
                  >
                    <Trash2 className='mr-1.5 size-3' />
                    {t('engineering.productAppearance.actions.delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductAppearanceEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        appearance={editingAppearance}
        onSaved={onAppearanceSaved}
      />
    </div>
  )
}
