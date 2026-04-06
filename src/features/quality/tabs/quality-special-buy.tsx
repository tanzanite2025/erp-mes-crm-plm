import { Award } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'

export function QualitySpecialBuy() {
    const { t } = useLanguage()

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
            <PageHeader
                icon={Award}
                title={t('quality.specialBuy.page.title')}
                description={t('quality.specialBuy.page.description')}
            />

            <div className='relative rounded-[32px] border border-dashed border-muted/50 bg-muted/5 h-[500px] flex flex-col items-center justify-center overflow-hidden shadow-inner'>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none" />
                <Award className="size-16 mb-6 opacity-10 stroke-[1.5px] text-primary" />
                <p className='text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40'>
                    {t('quality.specialBuy.page.placeholder')}
                </p>
            </div>
        </div>
    )
}
