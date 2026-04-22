import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

export function QualityStandardsEmpty() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col items-center justify-center py-32 text-muted-foreground/20'>
      <div className='animate-spin-slow mb-6 flex size-20 items-center justify-center rounded-full border-4 border-dashed border-muted/10'>
        <ShieldCheck className='size-10 opacity-20' />
      </div>
      <p className='text-[11px] font-black tracking-[0.4em] uppercase italic'>
        {t('quality.standards.page.empty')}
      </p>
    </div>
  )
}
