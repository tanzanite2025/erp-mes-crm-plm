import { AlertTriangle } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'

interface StockThresholdDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    material: { id: string, name: string, current: number } | null
    tempValue: string
    onValueChange: (value: string) => void
    onSave: () => void
}

export function StockThresholdDialog({
    open,
    onOpenChange,
    material,
    tempValue,
    onValueChange,
    onSave
}: StockThresholdDialogProps) {
    const { t } = useLanguage()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='w-[95vw] sm:max-w-[420px] p-0 overflow-hidden rounded-2xl md:rounded-[32px] border-none shadow-2xl'>
                <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />

                <div className='relative p-5 md:p-6'>
                    <DialogHeader className='mb-6'>
                        <DialogTitle className='text-base md:text-lg font-black tracking-tighter uppercase italic'>
                            {t('warehouse.stock.dialog.title')}
                        </DialogTitle>
                        <DialogDescription className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/30'>
                            {t('warehouse.stock.dialog.description')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className='space-y-5 md:space-y-6'>
                        <div className='space-y-2'>
                            <Label className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 block'>{t('warehouse.stock.dialog.targetNode')}</Label>
                            <div className='p-3 md:p-4 bg-muted/40 rounded-xl md:rounded-[20px] border border-dashed border-muted/80 shadow-inner group transition-colors hover:bg-muted/60'>
                                <div className='font-black text-sm md:text-base text-slate-800 tracking-tight italic truncate'>{material?.name}</div>
                                <div className='flex items-center gap-2 mt-1'>
                                    <Badge variant='outline' className='text-[7px] md:text-[8px] font-black uppercase tracking-widest bg-primary/10 border-none text-primary/80 h-3.5 px-2 rounded-full'>ID: {material?.id}</Badge>
                                </div>
                            </div>
                        </div>

                        <div className='space-y-2'>
                            <Label className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 block'>{t('warehouse.stock.dialog.minLevel')}</Label>
                            <div className='relative group'>
                                <Input
                                    type='number'
                                    className='h-11 md:h-12 rounded-xl md:rounded-[20px] bg-muted/50 border-none font-mono text-xl md:text-2xl font-black pl-5 md:pl-6 pr-12 md:pr-16 focus-visible:ring-primary shadow-inner transition-all'
                                    value={tempValue}
                                    onChange={(e) => onValueChange(e.target.value)}
                                    placeholder='0.00'
                                />
                                <div className='absolute right-4 md:right-6 top-1/2 -translate-y-1/2 text-muted-foreground/30 font-black text-[8px] md:text-[9px] tracking-widest uppercase select-none group-focus-within:text-primary transition-colors'>{t('warehouse.stock.dialog.units')}</div>
                            </div>
                            <div className='bg-amber-500/5 rounded-xl md:rounded-2xl p-2.5 md:p-3 border border-dashed border-amber-500/20 flex gap-2 items-start'>
                                <AlertTriangle className='size-3 text-amber-500 shrink-0 mt-0.5' />
                                <p className='text-[8px] md:text-[9px] text-amber-600/60 font-black uppercase tracking-widest leading-relaxed'>{t('warehouse.stock.dialog.warning')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className='p-5 md:p-6 pt-0 bg-transparent flex flex-row items-center justify-between gap-3'>
                    <Button
                        variant='ghost'
                        className='flex-1 h-10 rounded-full hover:bg-muted font-black text-[9px] uppercase tracking-widest transition-colors'
                        onClick={() => onOpenChange(false)}
                    >
                        {t('warehouse.stock.dialog.cancel')}
                    </Button>
                    <Button
                        className='flex-1 h-10 rounded-full shadow-lg shadow-primary/20 bg-primary font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 text-white'
                        onClick={onSave}
                    >
                        {t('warehouse.stock.dialog.update')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
