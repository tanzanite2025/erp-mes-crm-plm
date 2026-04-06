import { useLanguage } from '@/context/language-provider'

export function PieceworkQuery() {
    const { t } = useLanguage()
    return <Placeholder title={t('piecework.query.title')} />
}

export function PieceworkRules() {
    const { t } = useLanguage()
    return <Placeholder title={t('piecework.rules.title')} />
}

export function PieceworkStats() {
    const { t } = useLanguage()
    return <Placeholder title={t('piecework.stats.title')} />
}

function Placeholder({ title }: { title: string }) {
    const { t } = useLanguage()
    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            <div className='flex flex-col gap-1 bg-muted/5 p-6 rounded-[32px] border border-dashed border-muted/50'>
                <div className='flex items-center gap-2 text-primary'>
                    <h3 className='text-lg font-black tracking-tighter italic uppercase'>{t('piecework.placeholders.moduleTitle', { title })}</h3>
                </div>
                <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
                    {t('piecework.placeholders.moduleSubtitle')}
                </p>
            </div>

            <div className='rounded-[24px] border border-dashed border-muted/50 h-96 flex flex-col items-center justify-center text-muted-foreground/30 bg-muted/5'>
                <p className='text-xs font-black uppercase tracking-[0.3em] italic'>{t('piecework.placeholders.notAvailable', { title })}</p>
                <p className='text-[9px] uppercase tracking-widest mt-2'>{t('piecework.placeholders.underDevelopment')}</p>
            </div>
        </div>
    )
}
