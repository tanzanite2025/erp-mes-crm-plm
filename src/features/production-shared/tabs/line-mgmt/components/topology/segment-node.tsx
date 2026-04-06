import { memo, useState, useEffect } from 'react'
import { Layout, Plus, MoreVertical, X, Check, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import type { Segment } from '../../types'
import { ProcessNode } from './process-node'
import { SecurityAuthDialog } from './security-auth-dialog'
import { useLanguage } from '@/context/language-provider'

interface SegmentNodeProps {
    segment: Segment
    onUpdateName: (segmentId: string, name: string) => void
    onRemove: (segmentId: string) => void
    onAddProcess: (segmentId: string) => void
    onUpdateProcessName: (segmentId: string, processId: string, name: string) => void
    onRemoveProcess: (segmentId: string, processId: string) => void
}

export const SegmentNode = memo(({ 
    segment, 
    onUpdateName, 
    onRemove, 
    onAddProcess, 
    onUpdateProcessName, 
    onRemoveProcess
}: SegmentNodeProps) => {
    const { t } = useLanguage()
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(segment.name)
    const [isAuthOpen, setIsAuthOpen] = useState(false)
    const [pendingAction, setPendingAction] = useState<'rename' | 'remove' | null>(null)

    useEffect(() => {
        const timer = globalThis.setTimeout(() => {
            setEditValue(segment.name)
        }, 0)

        return () => {
            globalThis.clearTimeout(timer)
        }
    }, [segment.name])

    const handleAuthConfirm = () => {
        if (pendingAction === 'rename') {
            setIsEditing(true)
        } else if (pendingAction === 'remove') {
            onRemove(segment.id)
        }
    }

    const handleSave = () => {
        if (editValue.trim() !== "") {
            onUpdateName(segment.id, editValue)
        } else {
            setEditValue(segment.name)
        }
        setIsEditing(false)
    }

    return (
        <div className='group/segment flex flex-col gap-5 bg-muted/10 rounded-[32px] border-2 border-dashed border-muted/30 p-4 transition-all hover:bg-muted/15 w-full h-auto min-h-0'>
            {/* L1: 工段页眉 */}
            <div className='flex w-full items-center gap-4 pl-2 text-lg font-black italic tracking-tighter uppercase text-slate-900 dark:text-slate-100'>
                <Layout className='size-6 text-blue-600 shrink-0' />
                <div className='flex items-center gap-4 flex-1 min-w-0'>
                    <span className='shrink-0 text-blue-600/30 font-bold text-[10px] tracking-[0.2em]'>[{t('orgPersonnel.lineMgmt.topology.segment')}]</span>
                    
                    {isEditing ? (
                        <div className='flex items-center gap-2 flex-1 animate-in fade-in zoom-in-95 duration-200'>
                            <Input 
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave()
                                    if (e.key === 'Escape') { setEditValue(segment.name); setIsEditing(false); }
                                }}
                                className='h-9 min-w-0 flex-1 border-none bg-blue-50/50 px-2 text-lg font-black italic tracking-tighter focus:ring-2 focus:ring-blue-200 dark:bg-blue-500/10 dark:text-slate-100'
                                autoFocus
                            />
                            <button onClick={handleSave} className='text-emerald-500 hover:scale-110 transition-transform'>
                                <Check className='size-6' />
                            </button>
                        </div>
                    ) : (
                        <span className='flex-1 truncate px-2 text-lg font-black italic tracking-tighter text-slate-800 dark:text-slate-100'>
                            {segment.name}
                        </span>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant='ghost' 
                                size='icon' 
                                className='flex size-9 shrink-0 items-center justify-center text-slate-300 opacity-0 transition-opacity hover:text-slate-600 group-hover/segment:opacity-100 dark:text-slate-500 dark:hover:text-slate-300'
                            >
                                <MoreVertical className='size-5' />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='rounded-[24px] border border-border/50 bg-background/95 p-1 shadow-2xl backdrop-blur-md dark:bg-popover/95'>
                            <DropdownMenuItem 
                                onClick={() => { setPendingAction('rename'); setIsAuthOpen(true); }}
                                className='gap-2 text-[11px] font-bold uppercase tracking-widest rounded-xl px-4 py-3 cursor-pointer'
                            >
                                <ShieldCheck className='size-4 text-blue-500' />
                                {t('orgPersonnel.lineMgmt.topology.renameAuth')}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={() => { setPendingAction('remove'); setIsAuthOpen(true); }}
                                className='gap-2 text-[11px] font-bold uppercase tracking-widest text-rose-500 rounded-xl px-4 py-3 cursor-pointer focus:text-rose-600'
                            >
                                <X className='size-4' />
                                {t('orgPersonnel.lineMgmt.topology.removeAuth')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* L2: 工序列表 */}
            <div className='pl-6 sm:pl-10 flex flex-col gap-6 w-full h-auto min-h-0'>
                {(segment.processes || []).map((process) => (
                    <ProcessNode 
                        key={process.id}
                        segmentId={segment.id}
                        process={process}
                        onUpdateName={onUpdateProcessName}
                        onRemove={onRemoveProcess}
                    />
                ))}
                
                <Button 
                    variant='ghost' 
                    size='sm' 
                    className='h-10 gap-2 rounded-[24px] border border-dashed border-blue-200 bg-background/70 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600/50 shadow-sm transition-all hover:bg-white hover:text-blue-600 active:scale-95 dark:border-blue-400/20 dark:bg-white/4 dark:hover:bg-blue-500/10'
                    onClick={() => onAddProcess(segment.id)}
                >
                    <Plus className='size-4' /> {t('orgPersonnel.lineMgmt.topology.addProcess')}
                </Button>
            </div>

            <SecurityAuthDialog 
                open={isAuthOpen}
                onOpenChange={setIsAuthOpen}
                onConfirm={handleAuthConfirm}
                title={pendingAction === 'rename' ? t('orgPersonnel.lineMgmt.topology.segmentRenameTitle') : t('orgPersonnel.lineMgmt.topology.segmentRemoveTitle')}
                description={pendingAction === 'rename' ? t('orgPersonnel.lineMgmt.topology.segmentRenameDesc') : t('orgPersonnel.lineMgmt.topology.segmentRemoveDesc')}
            />
        </div>
    )
})
