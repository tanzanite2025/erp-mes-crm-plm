import { ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { getStaticEvidenceUrl } from '@/lib/url-utils'
import { Button } from '@/components/ui/button'
import type { SettlementRecordEvidenceApiDTO } from '../contracts/settlement-evidence-api-dto'

interface SettlementEvidenceGalleryProps {
  evidences: SettlementRecordEvidenceApiDTO[]
  deletingId?: string | null
  onDelete?: (evidenceId: string) => void
}

export function SettlementEvidenceGallery({
  evidences,
  deletingId,
  onDelete,
}: SettlementEvidenceGalleryProps) {
  if (evidences.length === 0) {
    return (
      <div className='flex min-h-[120px] flex-col items-center justify-center space-y-2 rounded-[24px] border border-dashed border-muted-foreground/20 bg-muted/5 p-4 text-center text-muted-foreground/30'>
        <ImageIcon className='size-8' />
        <p className='text-[10px] font-black tracking-[0.2em] uppercase italic'>
          当前记录暂无证据
        </p>
      </div>
    )
  }

  return (
    <div className='grid gap-4 md:grid-cols-2'>
      {evidences.map((evidence) => (
        <div
          key={evidence.id}
          className='group/item rounded-2xl border bg-background p-3 shadow-sm transition-all hover:shadow-md'
        >
          <div className='relative overflow-hidden rounded-2xl border bg-muted/10'>
            <a
              href={getStaticEvidenceUrl(evidence.asset.fileUrl)}
              target='_blank'
              rel='noreferrer'
            >
              <img
                src={getStaticEvidenceUrl(evidence.asset.fileUrl)}
                alt={evidence.asset.fileName}
                className='h-40 w-full object-cover transition-transform duration-500 group-hover/item:scale-105'
              />
            </a>
          </div>
          <div className='mt-3 flex items-start justify-between gap-3'>
            <div className='min-w-0 space-y-1'>
              <div className='truncate text-[10px] font-bold text-muted-foreground'>
                {evidence.asset.fileName}
              </div>
              <div className='text-[10px] leading-4 text-muted-foreground'>
                {evidence.note || '未填写备注'}
              </div>
            </div>
            {onDelete ? (
              <Button
                type='button'
                variant='destructive'
                size='icon'
                className='h-8 w-8 rounded-full shadow-lg'
                onClick={() => onDelete(evidence.id)}
                disabled={deletingId === evidence.id}
              >
                {deletingId === evidence.id ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <Trash2 className='size-4' />
                )}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
