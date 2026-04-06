import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

export function DMInfoFooter() {
    const { t } = useLanguage()

    return (
        <div className='bg-background/40 p-6 lg:p-8 rounded-[2rem] border border-white/5 flex items-start gap-6'>
            <div className="p-4 bg-primary/10 rounded-2xl">
                <ShieldCheck className="size-6 text-primary" />
            </div>
            <div className="space-y-2">
                <h4 className='text-sm font-black uppercase tracking-tight'>{t('basicSettings.dmNumbering.footer.title' as any)}</h4>
                <p className='text-xs leading-relaxed text-muted-foreground/60 font-medium max-w-[800px]'>
                    {t('basicSettings.dmNumbering.footer.description' as any)}
                </p>
            </div>
        </div>
    )
}
