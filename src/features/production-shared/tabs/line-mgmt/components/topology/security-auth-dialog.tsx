import { useState } from 'react'
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Lock } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

interface SecurityAuthDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (password: string) => void | Promise<boolean | void>
    title?: string
    description?: string
}

export function SecurityAuthDialog({ 
    open, 
    onOpenChange, 
    onConfirm,
    title,
    description
}: SecurityAuthDialogProps) {
    const { t } = useLanguage()
    const finalTitle = title || t('orgPersonnel.lineMgmt.topology.authGenericTitle')
    const finalDescription = description || t('orgPersonnel.lineMgmt.topology.authGenericDesc')
    const [password, setPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setPassword("")
            setIsSubmitting(false)
        }
        onOpenChange(nextOpen)
    }

    const handleVerify = async () => {
        if (password.trim().length > 0) {
            setIsSubmitting(true)
            try {
                const result = await onConfirm(password)
                if (result !== false) {
                    handleOpenChange(false)
                }
            } catch {
                return
            } finally {
                setIsSubmitting(false)
            }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            void handleVerify()
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className='max-w-[400px] rounded-[32px] border border-border/50 bg-background/95 shadow-2xl backdrop-blur-xl dark:bg-popover/95'>
                <DialogHeader className='flex flex-col items-center gap-2'>
                    <div className='mb-2 flex size-12 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10'>
                        <Lock className='size-6 text-orange-500' />
                    </div>
                    <DialogTitle className='text-xl font-black italic tracking-tighter text-slate-900 dark:text-slate-100'>
                        {finalTitle}
                    </DialogTitle>
                    <DialogDescription className='px-4 text-center text-[11px] font-medium uppercase tracking-wider text-slate-500 leading-relaxed dark:text-slate-400'>
                        {finalDescription}
                    </DialogDescription>
                </DialogHeader>

                <div className='py-4 px-2 space-y-4'>
                    <div className='relative'>
                        <Input 
                            type='password'
                            placeholder={t('orgPersonnel.lineMgmt.topology.authPasswordPlaceholder')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className='h-12 rounded-2xl border-none bg-slate-100 text-center text-lg font-mono tracking-[0.5em] transition-all focus:ring-2 focus:ring-orange-500 dark:bg-white/6 dark:text-slate-100'
                            autoFocus
                        />
                    </div>
                </div>

                <DialogFooter className='sm:justify-center gap-2 mt-2'>
                    <Button 
                        variant='ghost' 
                        onClick={() => handleOpenChange(false)}
                        disabled={isSubmitting}
                        className='h-11 flex-1 rounded-full bg-slate-100 text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-slate-200 dark:bg-white/6 dark:hover:bg-white/10'
                    >
                        {t('orgPersonnel.lineMgmt.dialog.cancel')}
                    </Button>
                    <Button 
                        onClick={() => void handleVerify()}
                        disabled={password.trim().length === 0 || isSubmitting}
                        className='rounded-full h-11 font-bold text-[10px] uppercase tracking-widest bg-slate-900 hover:bg-black text-white shadow-lg transition-all flex-1 gap-2'
                    >
                        <ShieldCheck className='size-4' />
                        {t('orgPersonnel.lineMgmt.topology.authVerify')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
