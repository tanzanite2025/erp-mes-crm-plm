import { Hash, Waypoints } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { SequenceMgmt } from '@/features/basic-settings/tabs/sequence-mgmt'

export function SharedNumberingEngineMgmt() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-5 sm:p-6'>
        <div className='flex flex-col gap-5'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='flex items-start gap-3 text-primary'>
              <div className='flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10'>
                <Waypoints className='size-5' />
              </div>
              <div>
                <div className='text-lg font-black tracking-tight italic'>
                  {t('codeCenter.sharedCodeSource.numberingEngine.page.title')}
                </div>
                <div className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>
                  {t('codeCenter.sharedCodeSource.numberingEngine.page.description')}
                </div>
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <div className='inline-flex items-center gap-2 rounded-full border border-dashed border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-primary/70'>
                <Hash className='size-3.5' />
                <span>{t('codeCenter.sharedCodeSource.numberingEngine.page.badges.linearBarcode')}</span>
              </div>
            </div>
          </div>
          <div className='rounded-[24px] border border-dashed border-primary/15 bg-primary/5 px-4 py-3 text-[11px] text-muted-foreground'>
            {t('codeCenter.sharedCodeSource.numberingEngine.page.notice')}
          </div>
        </div>
      </div>

      <section className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-5 sm:p-6'>
        <div className='mb-6 flex items-start gap-3'>
          <div className='flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary'>
            <Hash className='size-5' />
          </div>
          <div className='space-y-2'>
            <div className='text-lg font-black tracking-tight italic'>
              {t('codeCenter.sharedCodeSource.numberingEngine.sections.linearBarcode.title')}
            </div>
            <div className='text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground/60'>
              {t('codeCenter.sharedCodeSource.numberingEngine.sections.linearBarcode.description')}
            </div>
            <div className='inline-flex rounded-full border border-dashed border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700'>
              {t('codeCenter.sharedCodeSource.numberingEngine.sections.linearBarcode.status')}
            </div>
          </div>
        </div>
        <SequenceMgmt />
      </section>
    </div>
  )
}
