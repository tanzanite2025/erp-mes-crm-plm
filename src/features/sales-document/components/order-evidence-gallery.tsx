import { type TranslationKey } from '@/locales'
import { ImageIcon, Loader2 } from 'lucide-react'
import { getStaticEvidenceUrl } from '@/lib/url-utils'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import type { OrderEvidence } from '../data/order-evidence'

interface OrderEvidenceGalleryProps {
  evidences: OrderEvidence[]
  titleKey?: TranslationKey
  presentation?: 'compact' | 'detail'
}

export function OrderEvidenceGallery({
  evidences,
  titleKey = 'tradingSalesOrder.detail.evidenceTitle',
  presentation = 'compact',
}: OrderEvidenceGalleryProps) {
  const { t } = useLanguage()

  if (!evidences || evidences.length === 0) {
    return null
  }

  return (
    <div className='mt-3 border-t border-muted-foreground/10 pt-3'>
      <div className='mb-2 flex items-center gap-2'>
        <ImageIcon className='size-3.5 text-primary' />
        <h4
          className={
            presentation === 'detail'
              ? 'text-sm font-semibold'
              : 'text-[9px] font-black tracking-wide text-muted-foreground/60 uppercase'
          }
        >
          {t(titleKey)}
        </h4>
      </div>
      <div className='flex flex-wrap gap-3'>
        {evidences.map((ev) => (
          <div
            key={ev.id}
            className={cn(
              'space-y-2',
              presentation === 'detail' ? 'w-32' : 'w-[96px]'
            )}
          >
            <div
              className={cn(
                'group relative overflow-hidden rounded-xl border bg-background shadow-sm transition-all hover:ring-2 hover:ring-primary/20',
                presentation === 'detail' ? 'size-28' : 'size-16'
              )}
            >
              {ev.url ? (
                <a
                  href={getStaticEvidenceUrl(ev.url)}
                  target='_blank'
                  rel='noreferrer'
                >
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
            {ev.note ? (
              <p
                className={
                  presentation === 'detail'
                    ? 'text-sm leading-6 [overflow-wrap:anywhere] text-muted-foreground'
                    : 'text-[10px] leading-4 font-medium text-muted-foreground'
                }
              >
                {ev.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
