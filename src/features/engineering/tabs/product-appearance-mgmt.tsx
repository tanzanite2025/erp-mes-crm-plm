'use client'

import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Hash,
  ImageIcon,
  Palette,
  Pencil,
  Plus,
  Rows3,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import {
  type ProductAppearance,
  type ProductAppearanceDraft,
} from '../data/product-appearance'
import { PRODUCT_APPEARANCES_QUERY_KEY } from '../query-keys'
import { productAppearanceService } from '../services/product-appearance-service'

const EMPTY_FORM: ProductAppearanceDraft = {
  name: '',
  barcodeCode: '',
  description: '',
  imageUrl: '',
  imageThumbnailUrl: '',
  imageName: '',
  active: true,
  sortOrder: 0,
  version: 0,
}

export function ProductAppearanceMgmt() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [imageInputResetKey, setImageInputResetKey] = useState(0)
  const [currentRow, setCurrentRow] =
    useState<ProductAppearanceDraft>(EMPTY_FORM)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const dialogShellClasses = buildActionDialogShellClasses({
    content: 'flex max-h-[86vh] flex-col sm:max-w-3xl',
    header:
      'relative shrink-0 border-b border-dashed border-muted/50 bg-muted/5 px-5 pb-4 pt-5 text-start sm:px-6',
    body: 'custom-scrollbar flex-1 overflow-y-auto px-5 py-4 sm:px-6',
    footer:
      'shrink-0 flex-row gap-3 border-t border-dashed border-muted/50 bg-muted/5 p-4 sm:justify-end sm:px-6',
    title:
      'flex flex-col gap-0.5 text-lg font-black uppercase tracking-tighter italic',
    description:
      'mt-2 text-[10px] font-black uppercase tracking-widest opacity-60',
  })

  const appearancesQuery = useQuery({
    queryKey: PRODUCT_APPEARANCES_QUERY_KEY,
    queryFn: () => productAppearanceService.getProductAppearances(),
  })

  if (appearancesQuery.isSuccess && !appearancesQuery.data)
    throw new Error('[CRITICAL] Appearances Data missing')

  const appearances = appearancesQuery.data || []
  const activeCount = useMemo(
    () => appearances.filter((item) => item.active).length,
    [appearances]
  )
  const usedCodes = useMemo(
    () =>
      new Set(appearances.map((item) => item.barcodeCode).filter(Boolean)).size,
    [appearances]
  )

  const openCreateDialog = () => {
    setCurrentRow(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEditDialog = (row: ProductAppearance) => {
    setCurrentRow({
      id: row.id,
      name: row.name,
      barcodeCode: row.barcodeCode,
      description: row.description,
      imageUrl: row.imageUrl,
      imageThumbnailUrl: row.imageThumbnailUrl,
      imageName: row.imageName,
      active: row.active,
      sortOrder: row.sortOrder,
      version: row.version,
    })
    setDialogOpen(true)
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        toast.error(t('engineering.productAppearance.toasts.imageReadFailed'))
        return
      }

      setCurrentRow((prev) => ({
        ...prev,
        imageUrl: result,
        imageThumbnailUrl: result,
        imageName: file.name,
      }))
    }
    reader.onerror = () => {
      toast.error(t('engineering.productAppearance.toasts.imageReadFailed'))
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setCurrentRow((prev) => ({
      ...prev,
      imageUrl: '',
      imageThumbnailUrl: '',
      imageName: '',
    }))
    setImageInputResetKey((current) => current + 1)
  }

  const handleSave = async () => {
    const nextRow: ProductAppearanceDraft = {
      ...currentRow,
      name: currentRow.name.trim(),
      barcodeCode: currentRow.barcodeCode.trim(),
      description: currentRow.description.trim(),
      imageUrl: currentRow.imageUrl?.trim() || '',
      imageThumbnailUrl:
        currentRow.imageThumbnailUrl?.trim() ||
        currentRow.imageUrl?.trim() ||
        '',
      imageName: currentRow.imageName?.trim() || '',
      sortOrder: Number(currentRow.sortOrder) || 0,
      version: currentRow.version ?? 0,
    }

    if (!nextRow.name || !nextRow.barcodeCode) {
      toast.error(t('engineering.productAppearance.toasts.required'))
      return
    }

    if (!/^[1-9]$/.test(nextRow.barcodeCode)) {
      toast.error(t('engineering.productAppearance.toasts.invalidBarcodeCode'))
      return
    }

    const duplicatedCode = appearances.some(
      (item) =>
        item.barcodeCode === nextRow.barcodeCode && item.id !== nextRow.id
    )

    if (duplicatedCode) {
      toast.error(
        t('engineering.productAppearance.toasts.duplicateBarcodeCode')
      )
      return
    }

    try {
      await productAppearanceService.saveProductAppearance(nextRow)
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_APPEARANCES_QUERY_KEY,
      })
      setDialogOpen(false)
      toast.success(t('engineering.productAppearance.toasts.saveSuccess'))
    } catch {
      toast.error(t('engineering.productAppearance.toasts.saveFailed'))
    }
  }

  const handleDelete = async (row: ProductAppearance) => {
    if (
      !window.confirm(
        t('engineering.productAppearance.actions.deleteConfirm', {
          name: row.name,
        })
      )
    ) {
      return
    }

    try {
      await productAppearanceService.deleteProductAppearance(row.id)
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_APPEARANCES_QUERY_KEY,
      })
      toast.success(t('engineering.productAppearance.toasts.deleteSuccess'))
    } catch {
      toast.error(t('engineering.productAppearance.toasts.deleteFailed'))
    }
  }

  const handleActiveChange = async (
    row: ProductAppearance,
    active: boolean
  ) => {
    try {
      await productAppearanceService.saveProductAppearance({
        id: row.id,
        name: row.name,
        barcodeCode: row.barcodeCode,
        description: row.description,
        imageUrl: row.imageUrl,
        imageThumbnailUrl: row.imageThumbnailUrl,
        imageName: row.imageName,
        active,
        sortOrder: row.sortOrder,
        version: row.version,
      })
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_APPEARANCES_QUERY_KEY,
      })
    } catch {
      toast.error(t('engineering.productAppearance.toasts.saveFailed'))
    }
  }

  return (
    <div className='flex animate-in flex-col gap-5 duration-700 fade-in lg:gap-6'>
      <div className='flex flex-col gap-3 rounded-[28px] border border-dashed border-muted/50 bg-muted/5 p-3 md:p-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2.5 text-primary'>
              <Palette className='size-4' />
              <h3 className='text-base font-black tracking-tighter uppercase italic md:text-lg'>
                {t('engineering.productAppearance.title')}
              </h3>
            </div>
            <p className='max-w-3xl text-[11px] leading-5 text-muted-foreground'>
              {t('engineering.productAppearance.description')}
            </p>
          </div>
          <Button
            className='h-10 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
            onClick={openCreateDialog}
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
            <Button variant='outline' onClick={openCreateDialog}>
              <Plus className='mr-2 size-4' />
              {t('engineering.productAppearance.actions.add')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-2.5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'>
          {appearances.map((row) => (
            <Card key={row.id} className='gap-2 border-none py-3 shadow-sm'>
              <CardContent className='space-y-2 px-3.5'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex min-w-0 flex-1 gap-2.5'>
                    <div className='flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-muted/20'>
                      {row.imageThumbnailUrl ? (
                        <img
                          src={row.imageThumbnailUrl}
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
                      checked={row.active}
                      onCheckedChange={(checked) =>
                        void handleActiveChange(row, checked)
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
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-7 px-2.5 text-[10px]'
                    onClick={() => openEditDialog(row)}
                  >
                    <Pencil className='mr-1.5 size-3' />
                    {t('engineering.productAppearance.actions.edit')}
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-7 px-2.5 text-[10px]'
                    onClick={() => void handleDelete(row)}
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

      <ActionDialogShell
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={
          <>
            <span>
              {currentRow.id
                ? t('engineering.productAppearance.dialog.editTitle')
                : t('engineering.productAppearance.dialog.createTitle')}
            </span>
            <span className='font-mono text-[9px] tracking-widest opacity-40'>
              PRODUCT_APPEARANCE_MASTER
            </span>
          </>
        }
        description={t('engineering.productAppearance.dialog.description')}
        contentClassName={dialogShellClasses.content}
        headerClassName={dialogShellClasses.header}
        bodyClassName={dialogShellClasses.body}
        footerClassName={dialogShellClasses.footer}
        titleClassName={dialogShellClasses.title}
        descriptionClassName={dialogShellClasses.description}
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDialogOpen(false)}
              className='h-11 flex-1 rounded-full px-8 text-[10px] font-black tracking-widest uppercase transition-all hover:bg-muted/30 sm:flex-none'
            >
              {t('engineering.productAppearance.actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSave()}
              className='h-11 flex-1 rounded-full px-10 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-primary/20 sm:flex-none'
            >
              {t('engineering.productAppearance.actions.save')}
            </Button>
          </>
        }
      >
        <div className='space-y-4'>
          <div className='rounded-[22px] border border-dashed border-primary/20 bg-primary/5 p-4'>
            <div className='mb-4 flex items-center gap-2.5 text-primary'>
              <div className='rounded-xl bg-primary/10 p-2'>
                <Palette className='size-4' />
              </div>
              <div className='space-y-0.5'>
                <div className='text-[11px] font-black tracking-widest uppercase'>
                  {t('engineering.productAppearance.title')}
                </div>
                <div className='font-mono text-[10px] tracking-[0.24em] uppercase opacity-50'>
                  MASTER_EDIT_FORM
                </div>
              </div>
            </div>
            <div className='grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]'>
              <div className='space-y-2'>
                <Label className='text-[10px] font-black tracking-widest text-primary/80 uppercase'>
                  {t('engineering.productAppearance.fields.image')}
                </Label>
                <div className='rounded-[18px] border border-dashed border-primary/20 bg-background/70 p-3'>
                  {currentRow.imageUrl ? (
                    <div className='space-y-2.5'>
                      <div className='relative aspect-square overflow-hidden rounded-[16px] border bg-muted/10'>
                        <img
                          src={currentRow.imageUrl}
                          alt={currentRow.name || 'appearance-image'}
                          className='size-full object-cover'
                        />
                      </div>
                      <div className='space-y-2'>
                        <div className='truncate text-[11px] font-black text-foreground'>
                          {currentRow.imageName ||
                            t('engineering.productAppearance.fields.image')}
                        </div>
                        <div className='grid grid-cols-2 gap-2'>
                          <Button
                            type='button'
                            variant='outline'
                            className='h-8 rounded-full px-3 text-[10px] font-black tracking-widest uppercase'
                            onClick={() => imageInputRef.current?.click()}
                          >
                            <Upload className='mr-1.5 size-3.5' />
                            {t(
                              'engineering.productAppearance.actions.replaceImage'
                            )}
                          </Button>
                          <Button
                            type='button'
                            variant='ghost'
                            className='h-8 rounded-full px-3 text-[10px] font-black tracking-widest text-destructive uppercase'
                            onClick={handleRemoveImage}
                          >
                            <X className='mr-1.5 size-3.5' />
                            {t(
                              'engineering.productAppearance.actions.removeImage'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type='button'
                      className='flex aspect-square w-full flex-col items-center justify-center gap-2.5 rounded-[16px] border border-dashed border-muted-foreground/20 bg-muted/5 px-3 text-center transition-all hover:border-primary/40 hover:bg-primary/5'
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <div className='flex size-14 items-center justify-center rounded-full bg-background text-muted-foreground/40 shadow-sm'>
                        <Upload className='size-5' />
                      </div>
                      <div className='space-y-1'>
                        <div className='text-[11px] font-black tracking-widest text-foreground uppercase'>
                          {t(
                            'engineering.productAppearance.actions.uploadImage'
                          )}
                        </div>
                        <div className='text-[10px] text-muted-foreground'>
                          {t('engineering.productAppearance.dialog.imageEmpty')}
                        </div>
                      </div>
                    </button>
                  )}
                  <input
                    key={imageInputResetKey}
                    ref={imageInputRef}
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={handleImageChange}
                  />
                </div>
              </div>
              <div className='grid content-start gap-4'>
                <div className='space-y-2'>
                  <Label className='text-[10px] font-black tracking-widest text-primary/80 uppercase'>
                    {t('engineering.productAppearance.fields.name')}
                  </Label>
                  <Input
                    className='h-11 rounded-2xl border-none bg-background/90 shadow-sm'
                    value={currentRow.name}
                    onChange={(event) =>
                      setCurrentRow((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder={t(
                      'engineering.productAppearance.placeholders.name'
                    )}
                  />
                </div>
                <div className='space-y-2'>
                  <Label className='text-[10px] font-black tracking-widest text-primary/80 uppercase'>
                    {t('engineering.productAppearance.fields.barcodeCode')}
                  </Label>
                  <Input
                    className='h-11 rounded-2xl border-none bg-background/90 shadow-sm'
                    value={currentRow.barcodeCode}
                    maxLength={1}
                    onChange={(event) =>
                      setCurrentRow((prev) => ({
                        ...prev,
                        barcodeCode: event.target.value.replace(/[^1-9]/g, ''),
                      }))
                    }
                    placeholder={t(
                      'engineering.productAppearance.placeholders.barcodeCode'
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className='space-y-4 rounded-[22px] bg-muted/25 p-4'>
            <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]'>
              <div className='space-y-2'>
                <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                  {t('engineering.productAppearance.fields.description')}
                </Label>
                <Textarea
                  className='min-h-20 rounded-[18px] border-none bg-background/90 shadow-sm'
                  value={currentRow.description}
                  onChange={(event) =>
                    setCurrentRow((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder={t(
                    'engineering.productAppearance.placeholders.description'
                  )}
                />
              </div>
              <div className='flex h-full flex-col justify-end'>
                <div className='flex min-h-20 items-center justify-between rounded-[18px] border border-dashed border-primary/20 bg-background/80 px-4 py-3 shadow-sm'>
                  <div className='space-y-1'>
                    <div className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                      {t('engineering.productAppearance.fields.active')}
                    </div>
                    <div className='text-xs font-black text-foreground'>
                      {currentRow.active
                        ? t('engineering.productAppearance.badges.active')
                        : t('engineering.productAppearance.badges.inactive')}
                    </div>
                  </div>
                  <Switch
                    checked={currentRow.active}
                    onCheckedChange={(checked) =>
                      setCurrentRow((prev) => ({ ...prev, active: checked }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </ActionDialogShell>
    </div>
  )
}
