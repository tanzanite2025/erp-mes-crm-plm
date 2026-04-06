import { RotateCcw } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'

interface DMNumberingResetDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    confirmText: string
    onConfirmTextChange: (text: string) => void
    onReset: () => void
}

export function DMNumberingResetDialog({
    open,
    onOpenChange,
    confirmText,
    onConfirmTextChange,
    onReset
}: DMNumberingResetDialogProps) {
    const { t } = useLanguage()
    const verifyTarget = t('basicSettings.dmNumbering.resetDialog.verifyTarget')

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md rounded-[32px] border-none shadow-2xl overflow-hidden p-0 bg-background'>
                <div className='absolute inset-0 bg-linear-to-b from-rose-500/5 via-transparent to-transparent pointer-events-none' />
                <div className='relative p-10'>
                    <DialogHeader className='mb-8'>
                        <div className='size-16 rounded-[24px] bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 border border-dashed border-rose-500/30 shadow-inner'>
                            <RotateCcw className='size-8 animate-spin-reverse opacity-80' />
                        </div>
                        <DialogTitle className='text-2xl font-black tracking-tighter uppercase italic'>{t('basicSettings.dmNumbering.resetDialog.title')}</DialogTitle>
                        <DialogDescription className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-2 leading-relaxed'>
                            {t('basicSettings.dmNumbering.resetDialog.description')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className='space-y-6'>
                        <div className='space-y-3'>
                            <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 italic pl-1'>{t('basicSettings.dmNumbering.resetDialog.verifyPrompt')}</p>
                            <div className='p-8 bg-muted/30 rounded-2xl border border-dashed border-muted/50 text-center select-none shadow-inner'>
                                <span className='text-[11px] font-black tracking-[0.8em] text-slate-400 dark:text-slate-500'>{verifyTarget}</span>
                            </div>
                        </div>
                        <Input
                            value={confirmText}
                            onChange={(e) => onConfirmTextChange(e.target.value)}
                            placeholder={t('basicSettings.dmNumbering.resetDialog.placeholder')}
                            className='h-12 rounded-2xl bg-muted/50 border-none font-black text-center text-sm focus:ring-1 focus:ring-rose-500/20 transition-all flex items-center px-4 shadow-inner'
                        />
                    </div>
                </div>

                <DialogFooter className='p-10 pt-0 bg-transparent flex items-center justify-between gap-4'>
                    <Button
                        variant='ghost'
                        className='flex-1 rounded-full h-11 font-black text-[10px] uppercase tracking-widest transition-colors hover:bg-muted italic'
                        onClick={() => onOpenChange(false)}
                    >
                        {t('basicSettings.dmNumbering.resetDialog.discard')}
                    </Button>
                    <Button
                        className={cn(
                            "flex-1 rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 gap-3 italic",
                            confirmText === verifyTarget 
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xl shadow-rose-500/40' 
                                : 'bg-muted text-muted-foreground/20 cursor-not-allowed grayscale'
                        )}
                        onClick={onReset}
                        disabled={confirmText !== verifyTarget}
                    >
                        <RotateCcw className='size-3.5' /> {t('basicSettings.dmNumbering.resetDialog.commit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
