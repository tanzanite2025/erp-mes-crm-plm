import { Award } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'

export function QualitySpecialBuy() {
  const { t } = useLanguage()

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={Award}
        title={t('quality.specialBuy.page.title')}
        description={t('quality.specialBuy.page.description')}
      />

      <div className='relative flex h-[500px] flex-col items-center justify-center overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 shadow-inner'>
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />
        <Award className='mb-6 size-16 stroke-[1.5px] text-primary opacity-10' />
        <p className='text-[10px] font-black tracking-[0.4em] text-muted-foreground/40 uppercase'>
          {t('quality.specialBuy.page.placeholder')}
        </p>
      </div>
    </div>
  )
}
