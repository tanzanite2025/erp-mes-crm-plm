import { ImageIcon, Loader2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { getStaticEvidenceUrl } from '@/lib/url-utils'
import { type OrderEvidence } from '../../data/schema'

interface OrderEvidenceGalleryProps {
  evidences: OrderEvidence[]
  titleKey?: string
  fallbackTitle?: string
}

export function OrderEvidenceGallery({
  evidences,
  titleKey = 'tradingSalesOrder.detail.evidenceTitle',
  fallbackTitle = 'Order Evidence',
}: OrderEvidenceGalleryProps) {
  const { t } = useLanguage()

  if (!evidences || evidences.length === 0) {
    return null
  }

  return (
    <div className='mt-6 border-t border-muted-foreground/10 pt-4'>
      <div className='mb-3 flex items-center gap-2'>
        <ImageIcon className='size-3.5 text-primary' />
        <h4 className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 italic'>
          {t(titleKey as never) || fallbackTitle}
        </h4>
      </div>
      <div className='flex flex-wrap gap-4'>
        {evidences.map((ev) => (
          <div key={ev.id} className='w-[112px] space-y-2'>
            <div className='group relative size-20 overflow-hidden rounded-xl border bg-background shadow-sm transition-all hover:ring-2 hover:ring-primary/20'>
              {ev.url ? (
                <a href={getStaticEvidenceUrl(ev.url)} target='_blank' rel='noreferrer'>
                  <img
                    src={getStaticEvidenceUrl(ev.url)}
                    alt={ev.name}
                    className='size-full object-cover transition-transform group-hover:scale-110'
                  />
                </a>
              ) : (
                <div className='flex size-full items-center justify-center'>
                  <Loader2 className='size-4 animate-spin text-muted-foreground/20' />
                </div>
              )}
            </div>
            {ev.note ? <p className='text-[10px] font-medium leading-4 text-muted-foreground'>{ev.note}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
