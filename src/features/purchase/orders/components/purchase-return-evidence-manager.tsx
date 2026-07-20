import { useRef, useState } from 'react'
import {
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { OrderEvidence } from '@/features/sales-document/data/order-evidence'

interface PurchaseReturnEvidenceManagerProps {
  evidences: OrderEvidence[]
  onChange: (evidences: OrderEvidence[]) => void
  title: string
  hint: string
  empty: string
  cameraAction: string
  uploadAction: string
  maxReachedText: string
  uploadFailedText: string
  noteLabel: string
  notePlaceholder: string
  locationLabel: string
  locationPlaceholder: string
  defectPartLabel: string
  defectPartPlaceholder: string
  disabled?: boolean
  maxCount?: number
  uploadPath?: string
}

interface UploadResponse {
  id: string
  url: string
  name: string
  uploadedAt: string
}

export function PurchaseReturnEvidenceManager({
  evidences,
  onChange,
  title,
  hint,
  empty,
  cameraAction,
  uploadAction,
  maxReachedText,
  uploadFailedText,
  noteLabel,
  notePlaceholder,
  locationLabel,
  locationPlaceholder,
  defectPartLabel,
  defectPartPlaceholder,
  disabled = false,
  maxCount = 10,
  uploadPath = '/purchase/evidence/upload',
}: PurchaseReturnEvidenceManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [draggingEvidenceId, setDraggingEvidenceId] = useState<string | null>(
    null
  )
  const [dragOverEvidenceId, setDragOverEvidenceId] = useState<string | null>(
    null
  )
  const [cameraInputResetKey, setCameraInputResetKey] = useState(0)
  const [uploadInputResetKey, setUploadInputResetKey] = useState(0)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const handleSelectedFiles = async (
    files: FileList | null,
    resetInput?: () => void
  ) => {
    if (!files || files.length === 0 || disabled) {
      resetInput?.()
      return
    }

    const remainingSlots = Math.max(maxCount - evidences.length, 0)
    if (remainingSlots === 0) {
      toast.error(maxReachedText.replace('{{max}}', String(maxCount)))
      resetInput?.()
      return
    }

    setUploading(true)
    const next = [...evidences]

    try {
      for (const file of Array.from(files).slice(0, remainingSlots)) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await apiFetch<UploadResponse>(uploadPath, {
          method: 'POST',
          body: formData,
        })

        next.push({
          id: response.id,
          url: response.url,
          name: response.name,
          uploadedAt: response.uploadedAt,
        })
      }

      onChange(next)
    } catch (error) {
      failLoudly(error, 'PurchaseReturnEvidenceManager.handleSelectedFiles', {
        silentUI: true,
      })
      toast.error(uploadFailedText)
    } finally {
      setUploading(false)
      resetInput?.()
    }
  }

  const removeEvidence = (id: string) => {
    onChange(evidences.filter((item) => item.id !== id))
  }

  const updateEvidence = (id: string, patch: Partial<OrderEvidence>) => {
    onChange(
      evidences.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  const reorderEvidences = (activeId: string, overId: string) => {
    if (activeId === overId) return

    const activeIndex = evidences.findIndex((item) => item.id === activeId)
    const overIndex = evidences.findIndex((item) => item.id === overId)
    if (activeIndex < 0 || overIndex < 0) return

    const next = [...evidences]
    const [active] = next.splice(activeIndex, 1)
    next.splice(overIndex, 0, active)
    onChange(next)
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <ImageIcon className='size-3.5 text-primary' />
          <p className='text-[10px] font-black tracking-[0.2em] text-muted-foreground/70 uppercase'>
            {title}
          </p>
        </div>
        <span className='font-mono text-[9px] text-muted-foreground/50'>
          {evidences.length} / {maxCount}
        </span>
      </div>

      <input
        key={cameraInputResetKey}
        ref={cameraInputRef}
        type='file'
        accept='image/*'
        capture='environment'
        className='hidden'
        disabled={disabled || uploading}
        onChange={(event) =>
          void handleSelectedFiles(event.target.files, () => {
            setCameraInputResetKey((current) => current + 1)
          })
        }
      />
      <input
        key={uploadInputResetKey}
        ref={uploadInputRef}
        type='file'
        accept='image/*'
        multiple
        className='hidden'
        disabled={disabled || uploading}
        onChange={(event) =>
          void handleSelectedFiles(event.target.files, () => {
            setUploadInputResetKey((current) => current + 1)
          })
        }
      />

      <div
        className={cn(
          'rounded-[24px] border border-dashed border-muted/40 bg-muted/10 p-4 transition-colors',
          !disabled && 'hover:border-primary/30'
        )}
      >
        <div className='mb-4 flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='rounded-full'
            disabled={disabled || uploading || evidences.length >= maxCount}
            onClick={() => cameraInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className='mr-2 size-3.5 animate-spin' />
            ) : (
              <Camera className='mr-2 size-3.5' />
            )}
            {cameraAction}
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='rounded-full'
            disabled={disabled || uploading || evidences.length >= maxCount}
            onClick={() => uploadInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className='mr-2 size-3.5 animate-spin' />
            ) : (
              <CloudUpload className='mr-2 size-3.5' />
            )}
            {uploadAction}
          </Button>
        </div>

        {evidences.length === 0 ? (
          <div className='flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[20px] bg-background/60 text-center text-muted-foreground/50'>
            <ImageIcon className='size-8' />
            <p className='text-[10px] font-bold'>{empty}</p>
          </div>
        ) : (
          <div className='grid gap-3 md:grid-cols-2'>
            {evidences.map((evidence) => (
              <div
                key={evidence.id}
                className={cn(
                  'group rounded-[18px] border bg-background p-3 shadow-sm transition-colors',
                  dragOverEvidenceId === evidence.id &&
                    draggingEvidenceId !== evidence.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                )}
                onDragOver={(event) => {
                  if (!draggingEvidenceId || disabled) return
                  event.preventDefault()
                  if (dragOverEvidenceId !== evidence.id) {
                    setDragOverEvidenceId(evidence.id)
                  }
                }}
                onDrop={(event) => {
                  if (!draggingEvidenceId || disabled) return
                  event.preventDefault()
                  reorderEvidences(draggingEvidenceId, evidence.id)
                  setDraggingEvidenceId(null)
                  setDragOverEvidenceId(null)
                }}
              >
                <div className='relative overflow-hidden rounded-[14px] border'>
                  <a
                    href={getStaticEvidenceUrl(evidence.url)}
                    target='_blank'
                    rel='noreferrer'
                  >
                    <img
                      src={getStaticEvidenceUrl(evidence.url)}
                      alt={evidence.name}
                      className='h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105'
                    />
                  </a>
                  {!disabled ? (
                    <div
                      draggable
                      onDragStart={(event) => {
                        setDraggingEvidenceId(evidence.id)
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', evidence.id)
                      }}
                      onDragEnd={() => {
                        setDraggingEvidenceId(null)
                        setDragOverEvidenceId(null)
                      }}
                      className='absolute top-2 left-2 flex size-8 cursor-move items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100'
                      aria-label='drag to reorder evidence'
                    >
                      <GripVertical className='size-4' />
                    </div>
                  ) : null}
                  {!disabled ? (
                    <button
                      type='button'
                      onClick={() => removeEvidence(evidence.id)}
                      className='absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100'
                      aria-label='remove evidence'
                    >
                      <Trash2 className='size-4' />
                    </button>
                  ) : null}
                </div>
                <div className='mt-3 space-y-2'>
                  <p className='truncate text-[10px] font-bold text-muted-foreground'>
                    {evidence.name}
                  </p>
                  <div className='space-y-1'>
                    <p className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                      {noteLabel}
                    </p>
                    <Input
                      value={evidence.note || ''}
                      onChange={(event) =>
                        updateEvidence(evidence.id, {
                          note: event.target.value,
                        })
                      }
                      placeholder={notePlaceholder}
                      className='h-9 rounded-xl text-xs'
                      disabled={disabled}
                    />
                  </div>
                  <div className='grid gap-2 sm:grid-cols-2'>
                    <div className='space-y-1'>
                      <p className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                        {locationLabel}
                      </p>
                      <Input
                        value={evidence.location || ''}
                        onChange={(event) =>
                          updateEvidence(evidence.id, {
                            location: event.target.value,
                          })
                        }
                        placeholder={locationPlaceholder}
                        className='h-9 rounded-xl text-xs'
                        disabled={disabled}
                      />
                    </div>
                    <div className='space-y-1'>
                      <p className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                        {defectPartLabel}
                      </p>
                      <Input
                        value={evidence.defectPart || ''}
                        onChange={(event) =>
                          updateEvidence(evidence.id, {
                            defectPart: event.target.value,
                          })
                        }
                        placeholder={defectPartPlaceholder}
                        className='h-9 rounded-xl text-xs'
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className='text-[9px] font-bold tracking-[0.16em] text-muted-foreground/60 uppercase'>
        {hint}
      </p>
    </div>
  )
}
