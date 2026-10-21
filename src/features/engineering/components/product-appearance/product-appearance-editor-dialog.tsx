import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { AssetService } from '@/services/asset-service'
import { ImageIcon, Palette, Save, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import {
  createProductAppearanceEditorDraft,
  resolveProductAppearanceImageSource,
  type ProductAppearance,
} from '../../data/product-appearance'
import { useProductAppearanceCatalogQueries } from '../../hooks/use-product-appearance-catalog-queries'
import { useProductAppearanceWriteActions } from '../../hooks/use-product-appearance-write-actions'
import { ProductAppearanceCatalogRequestState } from './product-appearance-catalog-request-state'

export interface ProductAppearanceEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appearance?: ProductAppearance
  onSaved?: (appearance: ProductAppearance) => void
}

const productAppearanceEditorDialogClasses = buildActionDialogShellClasses({
  content:
    'flex max-h-[90dvh] flex-col gap-0 rounded-[24px] sm:max-w-3xl sm:rounded-[32px] [&_[data-slot=button]]:rounded-full [&_[data-slot=dialog-close]]:rounded-full',
  header: 'border-muted/50 px-5 py-5 pr-12 text-start sm:px-6 sm:pr-12',
  title: 'flex items-center gap-2.5 text-base text-primary sm:text-lg',
  description:
    'text-[11px] leading-relaxed font-medium tracking-normal normal-case opacity-80',
  body: 'min-h-0 flex-1 overflow-y-auto p-5 sm:p-6',
  footer:
    'shrink-0 flex-row justify-end gap-3 border-muted/50 px-5 py-4 sm:px-6',
})

export function ProductAppearanceEditorDialog(
  props: ProductAppearanceEditorDialogProps
) {
  if (!props.open) return null
  return (
    <ProductAppearanceEditorDialogSession
      key={props.appearance?.id ?? 'new-appearance'}
      {...props}
    />
  )
}

function ProductAppearanceEditorDialogSession({
  appearance,
  onOpenChange,
  onSaved,
}: ProductAppearanceEditorDialogProps) {
  const { t } = useLanguage()
  const formId = useId()
  const [editingBaseline] = useState(appearance)
  const [draft, setDraft] = useState(() =>
    createProductAppearanceEditorDraft(appearance)
  )
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const saveInProgressRef = useRef(false)
  const uploadInProgressRef = useRef(false)
  const isMountedRef = useRef(true)
  const catalog = useProductAppearanceCatalogQueries()
  const { saveAppearance, isSavingAppearance } =
    useProductAppearanceWriteActions()
  const isBusy = isSavingAppearance || isUploadingImage
  const isCatalogReady = Boolean(catalog.data) && !catalog.error

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  function handleProductAppearanceEditorOpenChange(nextOpen: boolean) {
    if (!saveInProgressRef.current && !uploadInProgressRef.current)
      onOpenChange(nextOpen)
  }

  async function uploadProductAppearanceEditorImage(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || saveInProgressRef.current || uploadInProgressRef.current)
      return
    if (
      !['image/png', 'image/jpeg', 'image/gif'].includes(file.type) ||
      file.size > 50 * 1024 * 1024
    ) {
      toast.error(t('engineering.productAppearance.toasts.invalidImage'))
      return
    }
    uploadInProgressRef.current = true
    setIsUploadingImage(true)
    try {
      const uploaded = await AssetService.uploadFile(file)
      if (isMountedRef.current)
        setDraft((current) => ({
          ...current,
          imageUrl: uploaded.url,
          imageThumbnailUrl: uploaded.url,
          imageName: uploaded.fileName || file.name,
        }))
    } catch (error) {
      if (isMountedRef.current)
        toast.error(
          error instanceof Error
            ? error.message
            : t('engineering.productAppearance.toasts.imageUploadFailed')
        )
    } finally {
      uploadInProgressRef.current = false
      if (isMountedRef.current) setIsUploadingImage(false)
    }
  }

  async function saveProductAppearanceEditorDraft() {
    if (
      saveInProgressRef.current ||
      uploadInProgressRef.current ||
      !isCatalogReady
    )
      return
    if (!draft.name.trim() || !draft.barcodeCode.trim()) {
      toast.error(t('engineering.productAppearance.toasts.required'))
      return
    }
    if (!/^[1-9]$/.test(draft.barcodeCode.trim())) {
      toast.error(t('engineering.productAppearance.toasts.invalidBarcodeCode'))
      return
    }
    if (
      catalog.data?.some(
        (item) =>
          item.barcodeCode === draft.barcodeCode.trim() && item.id !== draft.id
      )
    ) {
      toast.error(
        t('engineering.productAppearance.toasts.duplicateBarcodeCode')
      )
      return
    }
    saveInProgressRef.current = true
    let savedAppearance: ProductAppearance
    try {
      savedAppearance = await saveAppearance({
        draft,
        current: editingBaseline,
      })
    } catch (error) {
      if (isMountedRef.current)
        toast.error(
          error instanceof Error
            ? error.message
            : t('engineering.productAppearance.toasts.saveFailed')
        )
      return
    } finally {
      saveInProgressRef.current = false
    }
    toast.success(t('engineering.productAppearance.toasts.saveSuccess'))
    onOpenChange(false)
    onSaved?.(savedAppearance)
  }

  return (
    <ActionDialogShell
      open
      onOpenChange={handleProductAppearanceEditorOpenChange}
      title={
        <>
          <Palette className='size-5 text-blue-600' />
          {t(
            editingBaseline
              ? 'engineering.productAppearance.dialog.editTitle'
              : 'engineering.productAppearance.dialog.createTitle'
          )}
        </>
      }
      description={t('engineering.productAppearance.dialog.description')}
      contentClassName={productAppearanceEditorDialogClasses.content}
      headerClassName={productAppearanceEditorDialogClasses.header}
      titleClassName={productAppearanceEditorDialogClasses.title}
      descriptionClassName={productAppearanceEditorDialogClasses.description}
      bodyClassName={productAppearanceEditorDialogClasses.body}
      footerClassName={productAppearanceEditorDialogClasses.footer}
      footer={
        <>
          <Button
            type='button'
            variant='outline'
            disabled={isBusy}
            className='h-11 rounded-full border-dashed bg-transparent px-6 text-[11px] font-black shadow-none'
            onClick={() => handleProductAppearanceEditorOpenChange(false)}
          >
            {t('engineering.productAppearance.actions.cancel')}
          </Button>
          <Button
            type='submit'
            form={formId}
            disabled={isBusy || !isCatalogReady}
            className='h-11 rounded-full bg-blue-600 px-8 text-[11px] font-black text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700'
          >
            <Save className='size-3.5' />
            {t(
              isSavingAppearance
                ? 'engineering.productAppearance.actions.saving'
                : 'engineering.productAppearance.actions.save'
            )}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className='space-y-4'
        onSubmit={(event) => {
          event.preventDefault()
          void saveProductAppearanceEditorDraft()
        }}
      >
        <ProductAppearanceCatalogRequestState
          isLoading={catalog.isPending}
          error={catalog.error}
          onRetry={() => void catalog.refetch()}
        />
        <fieldset disabled={isBusy} className='min-w-0 space-y-4'>
          <div className='grid gap-5 rounded-[24px] border border-dashed border-primary/15 bg-primary/5 p-4 sm:grid-cols-[180px_minmax(0,1fr)]'>
            <div className='min-w-0 space-y-3'>
              <p className='text-[10px] font-black tracking-wide text-muted-foreground'>
                {t('engineering.productAppearance.fields.image')}
              </p>
              <div className='flex h-36 items-center justify-center overflow-hidden rounded-[20px] border border-dashed border-primary/15 bg-background/70 sm:aspect-square sm:h-auto'>
                {draft.imageUrl ? (
                  <img
                    src={resolveProductAppearanceImageSource(draft.imageUrl)}
                    alt={
                      draft.name ||
                      t('engineering.productAppearance.fields.image')
                    }
                    className='size-full object-cover'
                  />
                ) : (
                  <div className='space-y-3 p-4 text-center'>
                    <ImageIcon className='mx-auto size-8 text-muted-foreground/40' />
                    <p className='text-[10px] text-muted-foreground'>
                      {t('engineering.productAppearance.dialog.imageEmpty')}
                    </p>
                  </div>
                )}
              </div>
              {draft.imageName && (
                <p className='truncate text-[10px] font-bold'>
                  {draft.imageName}
                </p>
              )}
              <div className='flex flex-wrap gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  className='h-8 flex-1 rounded-full border-dashed px-3 text-[10px] font-black'
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Upload className='size-3' />
                  {t(
                    draft.imageUrl
                      ? 'engineering.productAppearance.actions.replaceImage'
                      : 'engineering.productAppearance.actions.uploadImage'
                  )}
                </Button>
                {draft.imageUrl && (
                  <Button
                    type='button'
                    variant='ghost'
                    className='h-8 rounded-full px-3 text-[10px] font-black text-destructive'
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        imageUrl: '',
                        imageThumbnailUrl: '',
                        imageName: '',
                      }))
                    }
                  >
                    <X className='size-3' />
                    {t('engineering.productAppearance.actions.removeImage')}
                  </Button>
                )}
              </div>
              <input
                ref={imageInputRef}
                type='file'
                accept='.png,.jpg,.jpeg,.gif'
                className='hidden'
                aria-label={t('engineering.productAppearance.fields.image')}
                onChange={(event) =>
                  void uploadProductAppearanceEditorImage(event)
                }
              />
              <p className='text-[10px] leading-relaxed text-muted-foreground'>
                {t('engineering.productAppearance.dialog.imageHint')}
              </p>
              {isUploadingImage && (
                <p role='status' className='text-[10px] text-muted-foreground'>
                  {t('engineering.productAppearance.actions.uploading')}
                </p>
              )}
            </div>
            <div className='min-w-0 space-y-4'>
              <div className='space-y-2'>
                <Label
                  htmlFor={`${formId}-name`}
                  className='ml-1 text-[10px] font-black tracking-wide text-muted-foreground'
                >
                  {t('engineering.productAppearance.fields.name')}
                </Label>
                <Input
                  id={`${formId}-name`}
                  autoFocus
                  required
                  maxLength={100}
                  className='h-11 rounded-2xl border-none bg-background/90 px-4 text-xs font-bold shadow-none md:text-xs'
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder={t(
                    'engineering.productAppearance.placeholders.name'
                  )}
                />
              </div>
              <div className='space-y-2'>
                <Label
                  htmlFor={`${formId}-barcode`}
                  className='ml-1 text-[10px] font-black tracking-wide text-muted-foreground'
                >
                  {t('engineering.productAppearance.fields.barcodeCode')}
                </Label>
                <Input
                  id={`${formId}-barcode`}
                  required
                  maxLength={1}
                  inputMode='numeric'
                  pattern='[1-9]'
                  className='h-11 rounded-2xl border-none bg-background/90 px-4 text-xs font-bold shadow-none md:text-xs'
                  value={draft.barcodeCode}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      barcodeCode: event.target.value.replace(/[^1-9]/g, ''),
                    }))
                  }
                  placeholder={t(
                    'engineering.productAppearance.placeholders.barcodeCode'
                  )}
                />
              </div>
              <div className='flex items-center justify-between rounded-2xl border border-dashed border-primary/15 bg-background/70 p-4'>
                <Label
                  htmlFor={`${formId}-active`}
                  className='text-[10px] font-black text-muted-foreground'
                >
                  {t('engineering.productAppearance.fields.active')}
                </Label>
                <Switch
                  id={`${formId}-active`}
                  checked={draft.active}
                  onCheckedChange={(active) =>
                    setDraft((current) => ({ ...current, active }))
                  }
                />
              </div>
            </div>
          </div>
          <div className='space-y-2 rounded-[24px] border border-dashed border-muted/60 bg-muted/5 p-4'>
            <Label
              htmlFor={`${formId}-description`}
              className='ml-1 text-[10px] font-black tracking-wide text-muted-foreground'
            >
              {t('engineering.productAppearance.fields.description')}
            </Label>
            <Textarea
              id={`${formId}-description`}
              className='min-h-24 rounded-2xl border-none bg-muted/30 px-4 py-3 text-xs shadow-none md:text-xs'
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder={t(
                'engineering.productAppearance.placeholders.description'
              )}
            />
          </div>
        </fieldset>
      </form>
    </ActionDialogShell>
  )
}
