import React, { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, CloudUpload, GripVertical, ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import { type OrderEvidence } from '@/features/trading/data/schema'
import { apiFetch } from '@/lib/api-client'
import { failLoudly } from '@/lib/safe-catch'
import { getStaticEvidenceUrl } from '@/lib/url-utils'
import { cn } from '@/lib/utils'

interface DocumentEvidenceManagerProps {
  evidences: OrderEvidence[]
  onChange: (evidences: OrderEvidence[]) => void
  disabled?: boolean
  uploadPath?: string
}

export function DocumentEvidenceManager({
  evidences = [],
  onChange,
  disabled = false,
  uploadPath = '/sales-orders/evidence/upload',
}: DocumentEvidenceManagerProps) {
  const { t } = useLanguage()
  const [uploading, setUploading] = useState(false)
  const [draggingEvidenceId, setDraggingEvidenceId] = useState<string | null>(null)
  const [dragOverEvidenceId, setDragOverEvidenceId] = useState<string | null>(null)

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      setUploading(true)
      const newEvidences = [...evidences]

      try {
        for (const file of Array.from(files)) {
          if (file.size > 10 * 1024 * 1024) {
            toast.error(t('tradingSalesOrder.fileUploader.toasts.maxSizeExceeded', { max: 10 }))
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
            toast.warning(t('tradingSalesOrder.toasts.duplicateEvidence'), {
              description: t('tradingSalesOrder.toasts.duplicateEvidenceDetail'),
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
        toast.success(t('tradingSalesOrder.toasts.saved'))
      } catch (error) {
        failLoudly(error, 'DocumentEvidenceManager.handleFileUpload', { silentUI: true })
        toast.error(t('tradingSalesOrder.fileUploader.toasts.saveFailed'))
      } finally {
        setUploading(false)
        if (e.target) e.target.value = ''
      }
    },
    [evidences, onChange, t, uploadPath]
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
    <div className='group space-y-4'>
      <div className='flex items-center justify-between px-1'>
        <div className='flex items-center gap-2'>
          <ImageIcon className='size-3.5 text-primary' />
          <h4 className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic'>
            {t('tradingSalesOrder.detail.evidenceTitle')}
          </h4>
        </div>
        <span className='text-[8px] font-mono text-muted-foreground/40'>
          {evidences.length} / 10
        </span>
      </div>

      <div
        className={cn(
          'relative min-h-[100px] rounded-[24px] border border-dashed border-muted-foreground/20 bg-muted/5 p-3 transition-all',
          'hover:border-primary/30 hover:bg-muted/10'
        )}
      >
        <div className='grid gap-4 md:grid-cols-2'>
          {evidences.map((ev) => (
            <div
              key={ev.id}
              className={cn(
                'group/item rounded-2xl border bg-background p-3 shadow-sm transition-all hover:shadow-md',
                dragOverEvidenceId === ev.id && draggingEvidenceId !== ev.id ? 'border-primary bg-primary/5' : 'border-border'
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
                    className='h-40 w-full object-cover transition-transform duration-500 group-hover/item:scale-105'
                  />
                ) : (
                  <div className='flex h-40 items-center justify-center bg-muted/20'>
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
                    className='absolute left-2 top-2 flex size-8 cursor-move items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover/item:opacity-100'
                    aria-label='drag to reorder evidence'
                  >
                    <GripVertical className='size-4' />
                  </div>
                ) : null}

                {!disabled ? (
                  <Button
                    variant='destructive'
                    size='icon'
                    className='absolute right-2 top-2 h-8 w-8 rounded-full shadow-lg opacity-0 transition-opacity group-hover/item:opacity-100'
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

              <div className='mt-3 space-y-2'>
                <p className='truncate text-[10px] font-bold text-muted-foreground'>{ev.name}</p>
                <div className='space-y-1'>
                  <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                    {t('tradingSalesOrder.detail.evidenceNoteLabel')}
                  </p>
                  <Input
                    value={ev.note || ''}
                    onChange={(e) => updateEvidence(ev.id, { note: e.target.value })}
                    placeholder={t('tradingSalesOrder.detail.evidenceNotePlaceholder')}
                    className='h-9 rounded-xl bg-background text-xs shadow-none'
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          ))}

          {!disabled && evidences.length < 10 && (
            <div className='relative min-h-[240px]'>
              <input
                type='file'
                className='absolute inset-0 z-10 cursor-pointer opacity-0'
                accept='image/*'
                onChange={handleFileUpload}
                multiple
                disabled={uploading}
              />
              <div className='flex h-full min-h-[240px] flex-col items-center justify-center space-y-2 rounded-2xl border-2 border-dashed border-muted-foreground/20 transition-all hover:border-primary/50 hover:bg-primary/5'>
                {uploading ? (
                  <Loader2 className='size-6 animate-spin text-primary' />
                ) : (
                  <>
                    <div className='flex size-10 items-center justify-center rounded-full bg-muted group-hover:bg-primary/20'>
                      <CloudUpload className='size-5 text-muted-foreground group-hover:text-primary' />
                    </div>
                    <span className='px-1 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground'>
                      {t('tradingSalesOrder.fileUploader.upload')}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {evidences.length === 0 && !uploading && (
          <div className='absolute inset-0 flex flex-col items-center justify-center space-y-2 text-muted-foreground/30'>
            <CloudUpload className='size-8' />
            <p className='text-[10px] font-black uppercase tracking-[0.2em] italic'>
              {t('tradingSalesOrder.detail.evidencePlaceholder')}
            </p>
          </div>
        )}
      </div>

      <div className='flex items-center gap-2 px-1'>
        <div className='size-1 rounded-full bg-primary/40' />
        <p className='text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60'>
          {t('tradingSalesOrder.detail.evidenceHint')} · {t('tradingSalesOrder.detail.evidenceSortHint')}
        </p>
      </div>
    </div>
  )
}
