import { useCallback, useRef, useState } from 'react'
import {
  AlertCircle,
  Camera,
  CloudUpload,
  GripVertical,
  ImageIcon,
  Loader2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-client'
import { failLoudly } from '@/lib/safe-catch'
import { getStaticEvidenceUrl } from '@/lib/url-utils'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { OrderEvidence } from '../data/order-evidence'

interface DocumentEvidenceManagerProps {
  evidences: OrderEvidence[]
  onChange: (evidences: OrderEvidence[]) => void
  disabled?: boolean
  uploadPath?: string
  enableCameraCapture?: boolean
  maxCount?: number
  title?: string
  hint?: string
  emptyText?: string
  uploadActionText?: string
  cameraActionText?: string
  noteLabel?: string
  notePlaceholder?: string
  uploadSuccessText?: string
  uploadFailedText?: string
  maxSizeExceededText?: string
  duplicateTitle?: string
  duplicateDescription?: string
  compact?: boolean
  evidenceImageHeightClassName?: string
  compactUploadSlotMinHeightClassName?: string
}

export function DocumentEvidenceManager({
  evidences = [],
  onChange,
  disabled = false,
  uploadPath = '/sales-orders/evidence/upload',
  enableCameraCapture = false,
  maxCount = 10,
  title,
  hint,
  emptyText,
  uploadActionText,
  cameraActionText,
  noteLabel,
  notePlaceholder,
  uploadSuccessText,
  uploadFailedText,
  maxSizeExceededText,
  duplicateTitle,
  duplicateDescription,
  compact = false,
  evidenceImageHeightClassName,
  compactUploadSlotMinHeightClassName,
}: DocumentEvidenceManagerProps) {
  const { t } = useLanguage()
  const [uploading, setUploading] = useState(false)
  const [draggingEvidenceId, setDraggingEvidenceId] = useState<string | null>(
    null
  )
  const [dragOverEvidenceId, setDragOverEvidenceId] = useState<string | null>(
    null
  )
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const resolvedTitle = title ?? t('tradingSalesOrder.detail.evidenceTitle')
  const resolvedHint =
    hint ??
    `${t('tradingSalesOrder.detail.evidenceHint')} · ${t('tradingSalesOrder.detail.evidenceSortHint')}`
  const resolvedEmptyText =
    emptyText ?? t('tradingSalesOrder.detail.evidencePlaceholder')
  const resolvedUploadActionText =
    uploadActionText ?? t('tradingSalesOrder.fileUploader.upload')
  const resolvedCameraActionText =
    cameraActionText ?? t('tradingSalesOrder.fileUploader.upload')
  const resolvedNoteLabel =
    noteLabel ?? t('tradingSalesOrder.detail.evidenceNoteLabel')
  const resolvedNotePlaceholder =
    notePlaceholder ?? t('tradingSalesOrder.detail.evidenceNotePlaceholder')
  const resolvedUploadSuccessText =
    uploadSuccessText ?? t('tradingSalesOrder.toasts.saved')
  const resolvedUploadFailedText =
    uploadFailedText ?? t('tradingSalesOrder.fileUploader.toasts.saveFailed')
  const resolvedMaxSizeExceededText =
    maxSizeExceededText ??
    t('tradingSalesOrder.fileUploader.toasts.maxSizeExceeded', { max: 10 })
  const resolvedDuplicateTitle =
    duplicateTitle ?? t('tradingSalesOrder.toasts.duplicateEvidence')
  const resolvedDuplicateDescription =
    duplicateDescription ??
    t('tradingSalesOrder.toasts.duplicateEvidenceDetail')
  const shouldShowHint = resolvedHint.trim().length > 0
  const resolvedEvidenceImageHeightClassName =
    evidenceImageHeightClassName ?? (compact ? 'h-[72px]' : 'h-40')
  const resolvedCompactUploadSlotMinHeightClassName =
    compactUploadSlotMinHeightClassName ?? 'min-h-[84px]'

  const handleFileUpload = useCallback(
    async (files: FileList | null, resetInput?: () => void) => {
      if (!files || files.length === 0 || disabled) {
        resetInput?.()
        return
      }

      const remainingSlots = Math.max(maxCount - evidences.length, 0)
      if (remainingSlots === 0) {
        resetInput?.()
        return
      }

      setUploading(true)
      const newEvidences = [...evidences]

      try {
        for (const file of Array.from(files).slice(0, remainingSlots)) {
          if (file.size > 10 * 1024 * 1024) {
            toast.error(resolvedMaxSizeExceededText)
            continue
          }

          const formData = new FormData()
          formData.append('file', file)

          const response = await apiFetch<{
            id: string
            url: string
            name: string
            uploadedAt: string
            isDuplicate: boolean
          }>(uploadPath, {
            method: 'POST',
            body: formData,
          })

          if (response.isDuplicate) {
            toast.warning(resolvedDuplicateTitle, {
              description: resolvedDuplicateDescription,
              icon: <AlertCircle className='size-4 text-amber-500' />,
            })
          }

          newEvidences.push({
            id: response.id,
            url: response.url,
            name: response.name,
            uploadedAt: response.uploadedAt,
          })
        }
        onChange(newEvidences)
        toast.success(resolvedUploadSuccessText)
      } catch (error) {
        failLoudly(error, 'DocumentEvidenceManager.handleFileUpload', {
          silentUI: true,
        })
        toast.error(resolvedUploadFailedText)
      } finally {
        setUploading(false)
        resetInput?.()
      }
    },
    [
      disabled,
      evidences,
      maxCount,
      onChange,
      resolvedDuplicateDescription,
      resolvedDuplicateTitle,
      resolvedMaxSizeExceededText,
      resolvedUploadFailedText,
      resolvedUploadSuccessText,
      uploadPath,
    ]
  )

  const removeEvidence = (id: string) => {
    onChange(evidences.filter((ev) => ev.id !== id))
  }

  const updateEvidence = (id: string, patch: Partial<OrderEvidence>) => {
    onChange(evidences.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)))
  }

  const reorderEvidences = (activeId: string, overId: string) => {
    if (activeId === overId) return

    const activeIndex = evidences.findIndex((ev) => ev.id === activeId)
    const overIndex = evidences.findIndex((ev) => ev.id === overId)
    if (activeIndex < 0 || overIndex < 0) return

    const next = [...evidences]
    const [active] = next.splice(activeIndex, 1)
    next.splice(overIndex, 0, active)
    onChange(next)
  }

  return (
    <div className={cn('group', compact ? 'space-y-2' : 'space-y-4')}>
      <div
        className={cn(
          'flex items-center justify-between',
          compact ? 'px-0.5' : 'px-1'
        )}
      >
        <div className='flex items-center gap-2'>
          <ImageIcon className='size-3.5 text-primary' />
          <h4
            className={cn(
              'font-black text-muted-foreground uppercase italic',
              compact
                ? 'text-[9px] tracking-[0.16em]'
                : 'text-[10px] tracking-[0.2em]'
            )}
          >
            {resolvedTitle}
          </h4>
        </div>
        <span className='font-mono text-[8px] text-muted-foreground/40'>
          {evidences.length} / {maxCount}
        </span>
      </div>

      {enableCameraCapture ? (
        <>
          <input
            ref={cameraInputRef}
            type='file'
            className='hidden'
            accept='image/*'
            capture='environment'
            onChange={(event) =>
              void handleFileUpload(event.target.files, () => {
                event.target.value = ''
              })
            }
            disabled={uploading || disabled || evidences.length >= maxCount}
          />
          <div
            className={cn('flex flex-wrap gap-2', compact ? 'px-0.5' : 'px-1')}
          >
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='rounded-full'
              disabled={uploading || disabled || evidences.length >= maxCount}
              onClick={() => cameraInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className='mr-2 size-3.5 animate-spin' />
              ) : (
                <Camera className='mr-2 size-3.5' />
              )}
              {resolvedCameraActionText}
            </Button>
          </div>
        </>
      ) : null}

      <div
        className={cn(
          compact
            ? 'relative min-h-[64px] rounded-[18px] border border-dashed border-muted-foreground/20 bg-muted/5 p-2 transition-all'
            : 'relative min-h-[100px] rounded-[24px] border border-dashed border-muted-foreground/20 bg-muted/5 p-3 transition-all',
          'hover:border-primary/30 hover:bg-muted/10'
        )}
      >
        <div className={cn('grid md:grid-cols-2', compact ? 'gap-2' : 'gap-4')}>
          {evidences.map((ev) => (
            <div
              key={ev.id}
              className={cn(
                compact
                  ? 'group/item rounded-[16px] border bg-background p-2 shadow-sm transition-all hover:shadow-md'
                  : 'group/item rounded-2xl border bg-background p-3 shadow-sm transition-all hover:shadow-md',
                dragOverEvidenceId === ev.id && draggingEvidenceId !== ev.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              )}
              onDragOver={(e) => {
                if (!draggingEvidenceId || disabled) return
                e.preventDefault()
                if (dragOverEvidenceId !== ev.id) {
                  setDragOverEvidenceId(ev.id)
                }
              }}
              onDrop={(e) => {
                if (!draggingEvidenceId || disabled) return
                e.preventDefault()
                reorderEvidences(draggingEvidenceId, ev.id)
                setDraggingEvidenceId(null)
                setDragOverEvidenceId(null)
              }}
            >
              <div className='relative overflow-hidden rounded-2xl border bg-muted/10'>
                {ev.url ? (
                  <img
                    src={getStaticEvidenceUrl(ev.url)}
                    alt={ev.name}
                    className={cn(
                      'w-full object-cover transition-transform duration-500 group-hover/item:scale-105',
                      resolvedEvidenceImageHeightClassName
                    )}
                  />
                ) : (
                  <div
                    className={cn(
                      'flex items-center justify-center bg-muted/20',
                      resolvedEvidenceImageHeightClassName
                    )}
                  >
                    <Loader2 className='size-4 animate-spin text-muted-foreground/40' />
                  </div>
                )}

                {!disabled ? (
                  <div
                    draggable
                    onDragStart={(e) => {
                      setDraggingEvidenceId(ev.id)
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', ev.id)
                    }}
                    onDragEnd={() => {
                      setDraggingEvidenceId(null)
                      setDragOverEvidenceId(null)
                    }}
                    className='absolute top-2 left-2 flex size-8 cursor-move items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover/item:opacity-100'
                    aria-label='drag to reorder evidence'
                  >
                    <GripVertical className='size-4' />
                  </div>
                ) : null}

                {!disabled ? (
                  <Button
                    variant='destructive'
                    size='icon'
                    className='absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 shadow-lg transition-opacity group-hover/item:opacity-100'
                    onClick={(e) => {
                      e.stopPropagation()
                      removeEvidence(ev.id)
                    }}
                    disabled={disabled}
                  >
                    <Trash2 className='size-4' />
                  </Button>
                ) : null}
              </div>

              <div
                className={cn(compact ? 'mt-1.5 space-y-1' : 'mt-3 space-y-2')}
              >
                <p className='truncate text-[10px] font-bold text-muted-foreground'>
                  {ev.name}
                </p>
                <div className='space-y-1'>
                  <p className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    {resolvedNoteLabel}
                  </p>
                  <Input
                    value={ev.note || ''}
                    onChange={(e) =>
                      updateEvidence(ev.id, { note: e.target.value })
                    }
                    placeholder={resolvedNotePlaceholder}
                    className={cn(
                      'rounded-xl bg-background text-xs shadow-none',
                      compact ? 'h-7.5' : 'h-9'
                    )}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          ))}

          {!disabled && evidences.length < maxCount ? (
            <div
              className={cn(
                'relative',
                compact
                  ? resolvedCompactUploadSlotMinHeightClassName
                  : 'min-h-[240px]'
              )}
            >
              <input
                type='file'
                className='absolute inset-0 z-10 cursor-pointer opacity-0'
                accept='image/*'
                onChange={(event) =>
                  void handleFileUpload(event.target.files, () => {
                    event.target.value = ''
                  })
                }
                multiple
                disabled={uploading || evidences.length >= maxCount}
              />
              <div
                className={cn(
                  'flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/20 transition-all hover:border-primary/50 hover:bg-primary/5',
                  compact
                    ? `${resolvedCompactUploadSlotMinHeightClassName} space-y-1.5 rounded-[16px]`
                    : 'min-h-[240px] space-y-2'
                )}
              >
                {uploading ? (
                  <Loader2
                    className={cn(
                      'animate-spin text-primary',
                      compact ? 'size-5' : 'size-6'
                    )}
                  />
                ) : (
                  <>
                    <div
                      className={cn(
                        'flex items-center justify-center rounded-full bg-muted group-hover:bg-primary/20',
                        compact ? 'size-7' : 'size-10'
                      )}
                    >
                      <CloudUpload
                        className={cn(
                          'text-muted-foreground group-hover:text-primary',
                          compact ? 'size-3.5' : 'size-5'
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        'px-1 text-center font-black text-muted-foreground uppercase',
                        compact
                          ? 'text-[8px] tracking-[0.12em]'
                          : 'text-[9px] tracking-widest'
                      )}
                    >
                      {resolvedUploadActionText}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {evidences.length === 0 && !uploading && (
          <div
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30',
              compact ? 'space-y-1' : 'space-y-2'
            )}
          >
            <CloudUpload className={cn(compact ? 'size-6' : 'size-8')} />
            <p
              className={cn(
                'font-black uppercase italic',
                compact
                  ? 'text-[9px] tracking-[0.14em]'
                  : 'text-[10px] tracking-[0.2em]'
              )}
            >
              {resolvedEmptyText}
            </p>
          </div>
        )}
      </div>

      {shouldShowHint ? (
        <div
          className={cn('flex items-center gap-2', compact ? 'px-0.5' : 'px-1')}
        >
          <div className='size-1 rounded-full bg-primary/40' />
          <p
            className={cn(
              'font-bold tracking-widest text-muted-foreground/60 uppercase',
              compact ? 'text-[8px]' : 'text-[9px]'
            )}
          >
            {resolvedHint}
          </p>
        </div>
      ) : null}
    </div>
  )
}
