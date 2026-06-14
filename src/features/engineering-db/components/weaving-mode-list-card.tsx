import { Pencil, Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { type WeavingMode } from '../data/weaving-mode-schema'

interface WeavingModeListCardProps {
  data: WeavingMode[]
  isLoading: boolean
  isLoadError: boolean
  onRetry: () => void
  onEdit: (item: WeavingMode) => void
  onDelete: (item: WeavingMode) => Promise<void>
}

export function WeavingModeListCard({
  data,
  isLoading,
  isLoadError,
  onRetry,
  onEdit,
  onDelete,
}: WeavingModeListCardProps) {
  const { t } = useLanguage()

  return (
    <div className='overflow-hidden rounded-[24px] border border-dashed border-muted/40 bg-background shadow-none'>
      <div className='hidden grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_auto] gap-4 border-b border-dashed border-muted/30 bg-muted/20 px-4 py-2.5 text-[10px] font-black tracking-[0.2em] text-muted-foreground/60 uppercase md:grid'>
        <div>{t('engineering.masterData.weavingMode.table.mode')}</div>
        <div>{t('engineering.masterData.weavingMode.table.ratio')}</div>
        <div>{t('engineering.masterData.weavingMode.table.source')}</div>
        <div>{t('engineering.masterData.weavingMode.table.status')}</div>
        <div>{t('engineering.masterData.weavingMode.table.actions')}</div>
      </div>

      {isLoading ? (
        <div className='p-8 text-center text-[10px] font-black tracking-[0.28em] text-muted-foreground/60 uppercase'>
          {t('common.status.syncing')}
        </div>
      ) : isLoadError ? (
        <div className='p-8 text-center'>
          <div className='text-[10px] font-black tracking-[0.28em] text-destructive/70 uppercase'>
            {t('engineering.masterData.weavingMode.toasts.loadFailed')}
          </div>
          <div className='mt-3'>
            <Button
              variant='outline'
              onClick={onRetry}
              className='rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
            >
              {t('common.actions.retry')}
            </Button>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className='p-8 text-center'>
          <div className='text-[10px] font-black tracking-[0.28em] text-muted-foreground/60 uppercase'>
            {t('engineering.masterData.weavingMode.empty.title')}
          </div>
          <div className='mx-auto mt-2 max-w-xl text-sm text-muted-foreground'>
            {t('engineering.masterData.weavingMode.empty.description')}
          </div>
        </div>
      ) : (
        <div className='divide-y divide-dashed divide-muted/40'>
          {data.map((item) => (
            <div
              key={item.id}
              className='grid gap-3 px-4 py-3 md:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_auto] md:items-center'
            >
              <div className='flex min-w-0 flex-col gap-1.5'>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='inline-flex rounded-full border border-dashed border-primary/20 bg-primary/5 px-2.5 py-1 text-[9px] font-black tracking-[0.16em] text-primary/70 uppercase'>
                    {item.label}
                  </div>
                  <div className='text-xs font-bold text-foreground'>
                    {item.normalizedRatioKey}
                  </div>
                </div>
                <div className='text-[10px] text-muted-foreground/75'>
                  {item.description ||
                    t(
                      'engineering.masterData.weavingMode.empty.descriptionFallback'
                    )}
                </div>
              </div>
              <div className='font-mono text-xs font-bold text-foreground'>
                {item.ratioNumerator} / {item.ratioDenominator}
              </div>
              <div>
                <span className='inline-flex rounded-full border border-dashed border-muted/40 bg-muted/10 px-2.5 py-1 text-[9px] font-black tracking-[0.16em] text-muted-foreground/80 uppercase'>
                  {item.isSystemPreset
                    ? t(
                        'engineering.masterData.weavingMode.badges.systemPreset'
                      )
                    : t('engineering.masterData.weavingMode.badges.custom')}
                </span>
              </div>
              <div>
                <span className='inline-flex rounded-full border border-dashed border-muted/40 bg-muted/10 px-2.5 py-1 text-[9px] font-black tracking-[0.16em] text-muted-foreground/80 uppercase'>
                  {item.active
                    ? t('engineering.masterData.weavingMode.badges.active')
                    : t('engineering.masterData.weavingMode.badges.inactive')}
                </span>
              </div>
              <div className='flex items-center gap-2 md:justify-end'>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 rounded-full px-3 text-[10px] font-black tracking-widest uppercase'
                  onClick={() => onEdit(item)}
                >
                  <Pencil className='mr-1.5 size-3.5' />
                  {t('engineering.masterData.weavingMode.actions.edit')}
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 rounded-full px-3 text-[10px] font-black tracking-widest text-destructive uppercase'
                  onClick={() => void onDelete(item)}
                >
                  <Trash2 className='mr-1.5 size-3.5' />
                  {t('engineering.masterData.weavingMode.actions.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
