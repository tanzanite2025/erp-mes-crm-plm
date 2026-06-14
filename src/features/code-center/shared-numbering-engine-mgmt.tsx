import { Hash } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { SequenceMgmt } from '@/features/basic-settings/tabs/sequence-mgmt'

export function SharedNumberingEngineMgmt() {
  const { t } = useLanguage()

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <div className='flex flex-col gap-4'>
        <IndustrialHeader
          icon={Hash}
          title={t('codeCenter.sharedCodeSource.numberingEngine.page.title')}
          description={t(
            'codeCenter.sharedCodeSource.numberingEngine.page.description'
          )}
          gradient
          statusBadge={
            <div className='inline-flex items-center gap-2 rounded-full border border-dashed border-primary/20 bg-primary/5 px-4 py-1.5 text-[10px] font-black tracking-[0.22em] text-primary/70 uppercase'>
              <Hash className='size-3.5' />
              <span>
                {t(
                  'codeCenter.sharedCodeSource.numberingEngine.page.badges.linearBarcode'
                )}
              </span>
            </div>
          }
        />
        <div className='rounded-[24px] border border-dashed border-primary/15 bg-primary/5 px-4 py-3 text-[11px] text-muted-foreground'>
          {t('codeCenter.sharedCodeSource.numberingEngine.page.notice')}
        </div>
      </div>

      <section className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-5 sm:p-6'>
        <SequenceMgmt hideHeader />
      </section>
    </div>
  )
}
