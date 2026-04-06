import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

export function QualityStandardsEmpty() {
    const { t } = useLanguage()

    return (
        <div className="py-32 flex flex-col items-center justify-center text-muted-foreground/20">
            <div className='size-20 rounded-full border-4 border-dashed border-muted/10 flex items-center justify-center mb-6 animate-spin-slow'>
                <ShieldCheck className="size-10 opacity-20" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] italic">
                {t('quality.standards.page.empty')}
            </p>
        </div>
    )
}
