import React, { useCallback, useEffect, useState } from 'react'
import { CloudUpload, ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { cn } from '@/lib/utils'
import { type OrderEvidence } from '../../data/schema'

interface OrderEvidenceManagerProps {
  evidences: OrderEvidence[]
  onChange: (evidences: OrderEvidence[]) => void
  disabled?: boolean
}

/**
 * 销售订单凭据管理组件 (OrderEvidenceManager)
 * 职责: 独立管理订单相关的截图、凭据。支持多图上传、实时预览及单项删除。
 * 遵循 UDS 1.0 工业感设计规范。
 */
export function OrderEvidenceManager({
  evidences = [],
  onChange,
  disabled = false,
}: OrderEvidenceManagerProps) {
  const { t } = useLanguage()
  const [uploading, setUploading] = useState(false)
  const [previews, setPreviews] = useState<Record<string, string>>({})

  // 解析并加载所有凭据的预览 URL
  useEffect(() => {
    const loadPreviews = async () => {
      const newPreviews: Record<string, string> = {}
      for (const ev of evidences) {
        if (!previews[ev.id]) {
          try {
            const blob = await StorageService.getItem<Blob>(ev.url)
            if (blob instanceof Blob) {
              newPreviews[ev.id] = URL.createObjectURL(blob)
            } else {
              // 如果不是 Blob，可能是远程 URL 或已失效
              newPreviews[ev.id] = ev.url
            }
          } catch (e) {
            console.error(`Failed to load evidence preview: ${ev.id}`, e)
          }
        }
      }
      if (Object.keys(newPreviews).length > 0) {
        setPreviews((prev) => ({ ...prev, ...newPreviews }))
      }
    }

    loadPreviews()

    // 清理函数
    return () => {
      // 在实际工程中建议在组件卸载或 evidences 变更时 revokeObjectURL
    }
  }, [evidences])

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      setUploading(true)
      const newEvidences = [...evidences]

      try {
        for (const file of Array.from(files)) {
          // 限制文件大小 10MB
          if (file.size > 10 * 1024 * 1024) {
            toast.error(t('fileUploader.toasts.maxSizeExceeded', { max: 10 }))
            continue
          }

          const storageKey = `order-evidence-${Date.now()}-${file.name}`
          await StorageService.setItem(storageKey, file)

          const evidence: OrderEvidence = {
            id: crypto.randomUUID(),
            url: storageKey,
            name: file.name,
            uploadedAt: new Date().toISOString(),
          }
          newEvidences.push(evidence)
        }
        onChange(newEvidences)
        toast.success(t('tradingSalesOrder.toasts.saved'))
      } catch (error) {
        console.error('Evidence upload failed', error)
        toast.error(t('fileUploader.toasts.saveFailed'))
      } finally {
        setUploading(false)
        if (e.target) e.target.value = ''
      }
    },
    [evidences, onChange, t]
  )

  const removeEvidence = (id: string, storageKey: string) => {
    const filtered = evidences.filter((ev) => ev.id !== id)
    onChange(filtered)
    // 异步清理存储，非阻塞
    StorageService.removeItem(storageKey).catch(console.error)
  }

  return (
    <div className='group space-y-4'>
      <div className='flex items-center justify-between px-1'>
        <div className='flex items-center gap-2'>
          <ImageIcon className='size-3.5 text-primary' />
          <h4 className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic'>
            {t('tradingSalesOrder.detail.evidenceTitle') || '订单凭据 (Order Evidence)'}
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
        {/* 图片查看矩阵 */}
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
          {evidences.map((ev) => (
            <div
              key={ev.id}
              className='group/item relative aspect-square overflow-hidden rounded-2xl border bg-background shadow-sm transition-all hover:shadow-md'
            >
              {previews[ev.id] ? (
                <img
                  src={previews[ev.id]}
                  alt={ev.name}
                  className='size-full object-cover transition-transform duration-500 group-hover/item:scale-110'
                />
              ) : (
                <div className='flex size-full items-center justify-center bg-muted/20'>
                  <Loader2 className='size-4 animate-spin text-muted-foreground/40' />
                </div>
              )}

              {/* 遮罩与删除 */}
              <div className='absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/item:opacity-100'>
                <Button
                  variant='destructive'
                  size='icon'
                  className='h-8 w-8 rounded-full shadow-lg'
                  onClick={(e) => {
                    e.stopPropagation()
                    removeEvidence(ev.id, ev.url)
                  }}
                  disabled={disabled}
                >
                  <Trash2 className='size-4' />
                </Button>
                <p className='mt-2 truncate px-2 text-[8px] font-bold text-white uppercase tracking-tighter w-full text-center'>
                  {ev.name}
                </p>
              </div>
            </div>
          ))}

          {/* 上传触发器 */}
          {!disabled && evidences.length < 10 && (
            <div className='relative aspect-square'>
              <input
                type='file'
                className='absolute inset-0 z-10 cursor-pointer opacity-0'
                accept='image/*'
                onChange={handleFileUpload}
                multiple
                disabled={uploading}
              />
              <div className='flex size-full flex-col items-center justify-center space-y-2 rounded-2xl border-2 border-dashed border-muted-foreground/20 transition-all hover:border-primary/50 hover:bg-primary/5'>
                {uploading ? (
                  <Loader2 className='size-6 animate-spin text-primary' />
                ) : (
                  <>
                    <div className='flex size-10 items-center justify-center rounded-full bg-muted group-hover:bg-primary/20'>
                      <CloudUpload className='size-5 text-muted-foreground group-hover:text-primary' />
                    </div>
                    <span className='text-[9px] font-black uppercase tracking-widest text-muted-foreground'>
                      {t('fileUploader.upload') || 'UPLOAD'}
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
              {t('tradingSalesOrder.detail.evidencePlaceholder') || '无凭据图片 (NO EVIDENCE)'}
            </p>
          </div>
        )}
      </div>

      <div className='flex items-center gap-2 px-1'>
        <div className='size-1 rounded-full bg-primary/40' />
        <p className='text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest'>
          {t('tradingSalesOrder.detail.evidenceHint') || '支持多选上传，点击图片可进行管理 (MAX 10MB PER FILE)'}
        </p>
      </div>
    </div>
  )
}
