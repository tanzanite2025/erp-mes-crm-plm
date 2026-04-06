import { memo, useState, useEffect } from 'react'
import { MoreVertical, X, Check, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ProcessStep } from '../../types'
import { SecurityAuthDialog } from './security-auth-dialog'
import { useLanguage } from '@/context/language-provider'

interface ProcessNodeProps {
    segmentId: string
    process: ProcessStep
    onUpdateName: (segmentId: string, processId: string, name: string) => void
    onRemove: (segmentId: string, processId: string) => void
}

export const ProcessNode = memo(({ 
    segmentId, 
    process, 
    onUpdateName, 
    onRemove
}: ProcessNodeProps) => {
    const { t } = useLanguage()
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(process.name)
    const [isAuthOpen, setIsAuthOpen] = useState(false)
    const [pendingAction, setPendingAction] = useState<'rename' | 'remove' | null>(null)

    useEffect(() => {
        const timer = globalThis.setTimeout(() => {
            setEditValue(process.name)
        }, 0)

        return () => {
            globalThis.clearTimeout(timer)
        }
    }, [process.name])

    const handleAuthConfirm = () => {
        if (pendingAction === 'rename') {
            setIsEditing(true)
        } else if (pendingAction === 'remove') {
            onRemove(segmentId, process.id)
        }
    }

    const handleSave = () => {
        if (editValue.trim() !== "") {
            onUpdateName(segmentId, process.id, editValue)
        } else {
            setEditValue(process.name)
        }
        setIsEditing(false)
    }

    return (
        <div className='group/job relative flex h-auto min-h-0 w-full flex-col items-start rounded-[24px] border border-muted/30 bg-background/80 shadow-sm backdrop-blur-sm transition-all hover:border-blue-400/20 hover:shadow-md dark:bg-white/4'>
            <div className='w-full flex flex-col justify-start h-auto min-h-0 p-2'>
                <div className='flex flex-col items-start justify-start w-full' style={{ height: 'fit-content', padding: '0', gap: '0' }}>
                    <div className='mb-1 flex w-full items-center gap-2 text-sm font-black italic tracking-tighter uppercase text-slate-800 dark:text-slate-100' style={{ height: '28px' }}>
                        <span className='shrink-0 text-blue-600/40 font-bold text-[9px] tracking-widest pl-1'>[{t('orgPersonnel.lineMgmt.topology.process')}]</span>
                        
                        {isEditing ? (
                            <div className='flex items-center gap-1 flex-1 animate-in fade-in zoom-in-95 duration-200'>
                                <Input 
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave()
                                        if (e.key === 'Escape') { setEditValue(process.name); setIsEditing(false); }
                                    }}
                                    className='h-7 min-w-0 flex-1 border-none bg-blue-50/50 px-1.5 text-xs font-black italic tracking-tight focus:ring-1 focus:ring-blue-200 dark:bg-blue-500/10 dark:text-slate-100'
                                    autoFocus
                                />
                                <button onClick={handleSave} className='text-emerald-500 pr-1'>
                                    <Check className='size-4' />
                                </button>
                            </div>
                        ) : (
                            <span className='flex-1 truncate px-1.5 text-xs font-black italic tracking-tight text-slate-700 dark:text-slate-200'>
                                {process.name}
                            </span>
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button 
                                    type='button'
                                    className='flex size-7 shrink-0 items-center justify-center text-slate-300 opacity-0 transition-opacity hover:text-slate-600 group-hover/job:opacity-100 dark:text-slate-500 dark:hover:text-slate-300'
                                >
                                    <MoreVertical className='size-4' />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='rounded-2xl border border-border/50 bg-background/95 p-1 shadow-xl backdrop-blur-md dark:bg-popover/95'>
                                <DropdownMenuItem 
                                    onClick={() => { setPendingAction('rename'); setIsAuthOpen(true); }}
                                    className='gap-2 text-[10px] font-bold uppercase tracking-widest rounded-xl px-3 py-2 cursor-pointer'
                                >
                                    <ShieldCheck className='size-3.5 text-blue-500' />
                                    {t('orgPersonnel.lineMgmt.topology.renameProcess')}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => { setPendingAction('remove'); setIsAuthOpen(true); }}
                                    className='gap-2 text-[10px] font-bold uppercase tracking-widest text-rose-500 rounded-xl px-3 py-2 cursor-pointer focus:text-rose-600'
                                >
                                    <X className='size-3.5' />
                                    {t('orgPersonnel.lineMgmt.topology.removeProcess')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            <SecurityAuthDialog 
                open={isAuthOpen}
                onOpenChange={setIsAuthOpen}
                onConfirm={handleAuthConfirm}
                title={pendingAction === 'rename' ? t('orgPersonnel.lineMgmt.topology.processRenameTitle') : t('orgPersonnel.lineMgmt.topology.processRemoveTitle')}
                description={pendingAction === 'rename' ? t('orgPersonnel.lineMgmt.topology.processRenameDesc') : t('orgPersonnel.lineMgmt.topology.processRemoveDesc')}
            />
        </div>
    )
})
