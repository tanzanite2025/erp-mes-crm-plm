import type { PrepregBindingQrItem } from '../data/prepreg-binding-qr'

type RenderedPrepregBindingQrItem = PrepregBindingQrItem & {
  qrDataUrl: string
}

function formatExpiresAt(value: string): string {
  if (!value.trim()) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type PrepregBindingQrGridProps = {
  items: RenderedPrepregBindingQrItem[]
  title: string
  emptyTitle: string
  emptyDescription: string
  tokenLabel: string
  expiresAtLabel: string
  cardTip: string
}

export function PrepregBindingQrGrid({
  items,
  title,
  emptyTitle,
  emptyDescription,
  tokenLabel,
  expiresAtLabel,
  cardTip,
}: PrepregBindingQrGridProps) {
  if (!items.length) {
    return (
      <div className='rounded-[24px] border border-dashed border-muted/60 bg-muted/10 px-6 py-12 text-center'>
        <p className='text-sm font-black tracking-tighter text-foreground italic'>
          {emptyTitle}
        </p>
        <p className='mt-2 text-[10px] font-black tracking-[0.18em] text-muted-foreground/70 uppercase'>
          {emptyDescription}
        </p>
      </div>
    )
  }

  return (
    <div className='rounded-[24px] border border-dashed border-border/70 bg-background p-5'>
      <div className='flex items-center justify-between gap-3'>
        <p className='text-sm font-black tracking-tighter text-foreground italic'>
          {title}
        </p>
        <span className='rounded-full bg-primary/10 px-3 py-1 font-mono text-[8px] text-primary'>
          {items.length}
        </span>
      </div>

      <div className='mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {items.map((item, index) => (
          <div
            key={item.id}
            className='rounded-[24px] border border-dashed border-border/70 bg-muted/5 p-4'
          >
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='text-[10px] font-black tracking-[0.18em] text-muted-foreground/60 uppercase'>
                  {title}
                </p>
                <p className='mt-1 font-mono text-xs text-foreground/80'>
                  #{index + 1}
                </p>
              </div>
              <span className='rounded-full bg-emerald-500/10 px-2.5 py-1 font-mono text-[8px] text-emerald-600'>
                UNBOUND
              </span>
            </div>

            <div className='mt-4 rounded-[20px] border border-dashed border-border/60 bg-background p-3'>
              <img
                src={item.qrDataUrl}
                alt={item.token}
                className='mx-auto size-52 rounded-2xl bg-white p-2'
              />
            </div>

            <div className='mt-4 rounded-[18px] border border-dashed border-border/60 bg-background px-3 py-3'>
              <p className='text-[8px] font-black tracking-[0.16em] text-muted-foreground/60 uppercase'>
                {tokenLabel}
              </p>
              <p className='mt-2 font-mono text-[11px] leading-5 break-all text-foreground'>
                {item.token}
              </p>
            </div>

            <div className='mt-3 rounded-[18px] border border-dashed border-border/60 bg-background px-3 py-3'>
              <p className='text-[8px] font-black tracking-[0.16em] text-muted-foreground/60 uppercase'>
                {expiresAtLabel}
              </p>
              <p className='mt-2 font-mono text-[10px] leading-5 text-foreground/80'>
                {formatExpiresAt(item.expiresAt)}
              </p>
            </div>

            <p className='mt-3 text-[9px] font-black tracking-[0.16em] text-muted-foreground/70 uppercase'>
              {cardTip}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
