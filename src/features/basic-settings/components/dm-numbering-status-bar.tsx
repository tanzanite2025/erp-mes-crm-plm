import { RotateCcw, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'

interface DMNumberingStatusBarProps {
    onReset: () => void
    onPublish: () => void
}

export function DMNumberingStatusBar({ onReset, onPublish }: DMNumberingStatusBarProps) {
    const { t } = useLanguage()

    return (
        <div className='flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center bg-muted/5 p-4 md:p-6 rounded-[24px] border border-dashed border-muted/50 transition-all'>
            <div className="flex flex-wrap gap-4 items-center">
                <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-5 h-7 tracking-widest uppercase rounded-full italic shadow-sm">
                    {t('basicSettings.dmNumbering.page.badges.mirrorActive')}
                </Badge>
                <div className="w-px h-4 bg-muted-foreground/10 hidden sm:block" />
                <div className='flex items-center gap-2'>
                    <Zap className='size-3 text-amber-500 fill-amber-500/20' />
                    <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-tight italic">
                        {t('basicSettings.dmNumbering.page.badges.payload')}
                    </span>
                </div>
            </div>

            <div className='flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0'>
                <Button
                    variant='ghost'
                    className='w-full sm:w-auto rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/5 hover:text-rose-600 transition-all gap-2 italic'
                    onClick={onReset}
                >
                    <RotateCcw className='size-4' /> {t('basicSettings.dmNumbering.page.actions.reset')}
                </Button>
                <Button 
                    className='w-full sm:w-auto rounded-full bg-primary h-11 px-10 font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-primary/20 transition-all active:scale-95 italic'
                    onClick={onPublish}
                >
                    {t('basicSettings.dmNumbering.page.actions.publish')}
                </Button>
            </div>
        </div>
    )
}
