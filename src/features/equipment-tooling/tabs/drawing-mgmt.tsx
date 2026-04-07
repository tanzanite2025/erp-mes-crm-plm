'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilePlus, Search, FileText, Download, Trash2, Edit2, FileIcon, Tag, RotateCcw, History, User, Clock } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { isConflictError } from '@/lib/handle-server-error'
import { DrawingService } from '../services/drawing-service'
import { MoldService } from '../services/mold-service'
import { type MoldDrawing, type Mold, type MoldDrawingLog } from '../data/schema'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { useLanguage } from '@/context/language-provider'

import { useMutation } from '@tanstack/react-query'
import { DrawingActionDialog } from '../components/drawing-action-dialog'
import { type DeltaSet } from '@/lib/delta/types'

export function DrawingMgmt() {
    const { t } = useLanguage()
    const { runConfirmedAction } = useConfirmedActionFlow()
    const [drawings, setDrawings] = useState<MoldDrawing[]>([])
    const [molds, setMolds] = useState<Mold[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isLogOpen, setIsLogOpen] = useState(false)
    const [currentLogs, setCurrentLogs] = useState<MoldDrawingLog[]>([])
    const [selectedDrawing, setSelectedDrawing] = useState<MoldDrawing | null>(null)
    const [editingDrawing, setEditingDrawing] = useState<MoldDrawing | null>(null)
    const [error, setError] = useState<unknown>(null)

    const loadData = async () => {
        setError(null)
        try {
            const [drawingRecords, moldRecords] = await Promise.all([
                DrawingService.getDrawings(),
                MoldService.getMolds(),
            ])
            setDrawings(drawingRecords)
            setMolds(moldRecords)
        } catch (err) {
            setError(err)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const filteredDrawings = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase()
        if (!keyword) {
            return drawings
        }

        return drawings.filter((drawing) =>
            [drawing.name, drawing.moldSn ?? '']
                .some((value) => value.toLowerCase().includes(keyword))
        )
    }, [drawings, searchTerm])

    const openCreateDialog = () => {
        setEditingDrawing(null)
        setIsDialogOpen(true)
    }

    const openEditDialog = (drawing: MoldDrawing) => {
        setEditingDrawing(drawing)
        setIsDialogOpen(true)
    }

    const handleViewLogs = async (drawing: MoldDrawing) => {
        setSelectedDrawing(drawing)
        const logs = await DrawingService.getDrawingLogs(drawing.id)
        setCurrentLogs(logs)
        setIsLogOpen(true)
    }

    // SDRTS: 突变逻辑封装
    const mutation = useMutation({
        mutationFn: async ({
            data,
            isPatch,
            delta
        }: {
            data: MoldDrawing;
            isPatch?: boolean;
            delta?: DeltaSet
        }) => {
            if (isPatch && delta && editingDrawing) {
                return DrawingService.patchDrawing(editingDrawing.id, delta, editingDrawing.sysVersion)
            }
            return DrawingService.addDrawing(data)
        },
        onSuccess: () => {
            toast.success(editingDrawing ? t('equipmentTooling.drawings.toast.updated') : t('equipmentTooling.drawings.toast.created'))
            setIsDialogOpen(false)
            setEditingDrawing(null)
            loadData()
        },
        onError: (error: any) => {
            if (isConflictError(error)) {
                toast.error(t('equipmentTooling.drawings.toast.conflict'))
                return
            }
            const message = error instanceof Error ? error.message : t('equipmentTooling.common.unknownError')
            toast.error(t('equipmentTooling.drawings.toast.saveFailed', { message }))
        }
    })

    const handleSave = async (data: MoldDrawing, isPatch?: boolean, delta?: DeltaSet) => {
        mutation.mutate({ data, isPatch, delta })
    }

    const handleDownload = (drawing: MoldDrawing) => {
        const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || ''
        const fullUrl = drawing.fileUrl.startsWith('http') ? drawing.fileUrl : `${baseUrl}${drawing.fileUrl}`

        const link = document.createElement('a')
        link.href = fullUrl
        link.download = drawing.name
        link.target = '_blank'
        link.click()
    }

    const handleToggleStatus = (id: string, currentStatus?: MoldDrawing['status']) => {
        void runConfirmedAction({
            permission: 'action_equipment_drawing_delete',
            confirmKey: currentStatus === 'ACTIVE' 
                ? 'equipmentTooling.drawings.tooltips.obsolete' 
                : 'equipmentTooling.drawings.tooltips.activate',
            onAction: async () => {
                const nextStatus: MoldDrawing['status'] = currentStatus === 'ACTIVE' ? 'OBSOLETE' : 'ACTIVE'
                await DrawingService.updateDrawing(id, { status: nextStatus })
                toast.success(
                    nextStatus === 'ACTIVE'
                        ? t('equipmentTooling.drawings.toast.statusActive')
                        : t('equipmentTooling.drawings.toast.statusObsolete')
                )
                await loadData()
            }
        })
    }

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            <div className='flex flex-col gap-1 bg-muted/5 p-5 sm:p-6 rounded-[32px] border border-dashed border-muted/50'>
                <div className='flex items-center gap-2 text-primary'>
                    <FileText className='size-4' />
                    <h3 className='text-base sm:text-lg font-black tracking-tighter italic uppercase'>{t('equipmentTooling.drawings.page.title')}</h3>
                </div>
                <p className='text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
                    {t('equipmentTooling.drawings.page.description')}
                </p>
            </div>

            <div className='flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-muted/5 p-4 sm:p-5 rounded-[24px] border border-dashed'>
                <div className='relative w-full md:w-[400px] group'>
                    <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary' />
                    <Input
                        placeholder={t('equipmentTooling.drawings.page.searchPlaceholder')}
                        className='pl-11 h-12 w-full rounded-2xl border-none bg-muted/50 font-bold text-xs shadow-inner'
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>

                <Button
                    className='rounded-full h-12 px-8 bg-blue-600 hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-all w-full md:w-auto shrink-0'
                    onClick={openCreateDialog}
                >
                    <FilePlus className='size-4' />
                    {t('equipmentTooling.drawings.actions.add')}
                </Button>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {filteredDrawings.map((drawing) => (
                    <Card key={drawing.id} className='group overflow-hidden hover:shadow-2xl transition-all duration-500 border-dashed rounded-[24px] relative bg-muted/5 border-slate-200'>
                        <div className='absolute top-4 right-4 p-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 flex gap-2 z-10 bg-white/80 backdrop-blur-md rounded-2xl border border-dashed shadow-sm'>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='size-8 rounded-xl hover:bg-blue-50 text-blue-600'
                                title={t('equipmentTooling.drawings.tooltips.history')}
                                onClick={() => handleViewLogs(drawing)}
                            >
                                <History className='size-4' />
                            </Button>
                            <Button variant='ghost' size='icon' className='size-8 rounded-xl hover:bg-slate-100' onClick={() => openEditDialog(drawing)}>
                                <Edit2 className='size-4' />
                            </Button>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='size-8 rounded-xl hover:bg-rose-50 text-rose-500'
                                title={drawing.status === 'ACTIVE' ? t('equipmentTooling.drawings.tooltips.obsolete') : t('equipmentTooling.drawings.tooltips.activate')}
                                onClick={() => handleToggleStatus(drawing.id, drawing.status)}
                            >
                                {drawing.status === 'ACTIVE' ? <Trash2 className='size-4' /> : <RotateCcw className='size-4 text-emerald-500' />}
                            </Button>
                        </div>

                        <CardContent className='p-5 sm:p-6 space-y-6'>
                            <div className='flex items-center gap-4'>
                                <div className='size-14 sm:size-16 rounded-[24px] bg-primary/5 border border-dashed border-primary/20 flex items-center justify-center text-primary shrink-0'>
                                    {drawing.type === '3D' ? <FileIcon className='size-7 sm:size-8 text-purple-500' /> : <FileText className='size-7 sm:size-8 text-blue-500' />}
                                </div>
                                <div className='flex-1 min-w-0'>
                                    <h4 className={`text-base sm:text-lg font-black tracking-tighter truncate ${drawing.status === 'OBSOLETE' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                        {drawing.name}
                                    </h4>
                                    <div className='flex items-center gap-2 mt-1'>
                                        <Badge variant='outline' className='rounded-full h-4 text-[7px] font-black uppercase tracking-widest bg-slate-500/10 text-slate-600 border-none'>
                                            {t(`equipmentTooling.drawings.types.${drawing.type === '2D' ? 'twoD' : drawing.type === '3D' ? 'threeD' : drawing.type === 'TECH_SPEC' ? 'techSpec' : 'other'}`)}
                                        </Badge>
                                        <span className='text-[8px] font-mono text-muted-foreground/40 font-black uppercase'>{drawing.version}</span>
                                        {drawing.status === 'ACTIVE' && (
                                            <Badge variant='outline' className='rounded-full h-4 text-[7px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border-none'>
                                                {t('equipmentTooling.drawings.status.active')}
                                            </Badge>
                                        )}
                                        {drawing.status === 'OBSOLETE' && (
                                            <Badge variant='outline' className='rounded-full h-4 text-[7px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-600 border-none'>
                                                {t('equipmentTooling.drawings.status.obsolete')}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className='space-y-2'>
                                <div className='flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white border border-dashed border-slate-200'>
                                    <span className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2'>
                                        <Tag className='size-3' /> {t('equipmentTooling.drawings.card.asset')}
                                    </span>
                                    <span className='font-mono font-black text-blue-600 text-[10px]'>{drawing.moldSn || t('equipmentTooling.drawings.card.unbound')}</span>
                                </div>
                                <div className='flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground/30 px-2'>
                                    <span className='flex items-center gap-1'><Clock className='size-2.5' /> {t('equipmentTooling.drawings.card.date')}</span>
                                    <span className='font-mono italic'>{new Date(drawing.uploadedAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <Button
                                variant='outline'
                                className='w-full rounded-full border-dashed border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 gap-3 h-11 text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all'
                                onClick={() => handleDownload(drawing)}
                            >
                                <Download className='size-4' />
                                {t('equipmentTooling.drawings.actions.download')}
                            </Button>
                        </CardContent>
                    </Card>
                ))}

                {filteredDrawings.length === 0 && (
                    <div className='col-span-full py-20 flex flex-col items-center justify-center bg-muted/5 rounded-[32px] border border-dashed'>
                        <FileIcon className='size-12 text-muted-foreground/20 mb-4' />
                        <p className='text-sm font-black tracking-tighter text-muted-foreground/40 uppercase'>{t('equipmentTooling.drawings.empty.title')}</p>
                    </div>
                )}
            </div>

            <DrawingActionDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                currentRow={editingDrawing}
                molds={molds}
                onSubmit={handleSave}
            />

            <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
                <DialogContent className='w-[95vw] sm:max-w-[600px] max-h-[92vh] flex flex-col p-0 rounded-[32px] shadow-2xl border-none overflow-hidden'>
                    <DialogHeader className='p-6 sm:p-8 shrink-0 pb-4 bg-blue-600/5 border-b border-dashed border-blue-100'>
                        <DialogTitle className='flex items-center gap-3 text-xl font-black tracking-tighter'>
                            <History className='size-6 text-blue-600' />
                            {t('equipmentTooling.drawings.audit.title')}
                        </DialogTitle>
                        <DialogDescription className='text-[9px] font-black uppercase tracking-widest mt-1 opacity-60'>
                            {t('equipmentTooling.drawings.audit.description', {
                                fileId: selectedDrawing?.id?.slice(-8).toUpperCase() || '--------',
                                asset: selectedDrawing?.moldSn || t('equipmentTooling.drawings.audit.global'),
                            })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className='flex-1 overflow-y-auto px-6 sm:px-10 py-8 custom-scrollbar relative'>
                        <div className='absolute left-[24px] sm:left-[40px] top-8 bottom-8 w-px border-l-2 border-dashed border-slate-100' />
                        <div className='space-y-8'>
                            {currentLogs.length === 0 ? (
                                <div className='text-center py-16 opacity-30'>
                                    <p className='text-[10px] font-black uppercase tracking-widest'>{t('equipmentTooling.drawings.audit.empty')}</p>
                                </div>
                            ) : (
                                currentLogs.map((log) => (
                                    <div key={log.id} className='relative pl-10'>
                                        <div
                                            className={cn(
                                                'absolute left-[-21px] sm:left-[-5px] top-1 size-4 rounded-full border-2 border-white shadow-sm z-10',
                                                log.action === 'CREATED' ? 'bg-emerald-500' :
                                                log.action === 'BIND' ? 'bg-blue-600' :
                                                log.action === 'VERSION_UPDATE' ? 'bg-purple-600' :
                                                log.action === 'STATUS_CHANGE' ? 'bg-rose-500' : 'bg-slate-400'
                                            )}
                                        />

                                        <div className='bg-muted/5 p-4 rounded-2xl border border-dashed border-muted-foreground/10 hover:bg-white transition-all'>
                                            <div className='flex items-center justify-between mb-2'>
                                                <span className='text-[9px] font-black uppercase tracking-widest text-primary/40'>{log.action}</span>
                                                <span className='text-[8px] text-muted-foreground/30 font-mono font-bold italic'>{new Date(log.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <p className='text-sm font-black text-slate-700 tracking-tight leading-snug mb-3'>{log.details}</p>
                                            
                                            {/* SDRTS: 结构化差量可视化 (演进时间线) */}
                                            {log.delta && Object.keys(log.delta).length > 0 && (
                                                <div className='bg-white/50 p-3 rounded-xl border border-dashed border-slate-200 space-y-2 mb-3'>
                                                    <div className='text-[8px] font-black uppercase tracking-widest text-slate-400 border-b border-dashed border-slate-100 pb-1'>Technical Changes (SDRTS)</div>
                                                    <div className='space-y-1.5'>
                                                        {Object.entries(log.delta).map(([field, values]: [string, any]) => (
                                                            <div key={field} className='flex items-center gap-2 text-[9px] min-w-0'>
                                                                <span className='font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded italic whitespace-nowrap'>{field}</span>
                                                                <div className='flex items-center gap-1.5 flex-1 min-w-0 font-mono'>
                                                                    <span className='text-rose-400/60 line-through truncate max-w-[100px]'>{String(values.o ?? 'NULL')}</span>
                                                                    <span className='text-slate-300'>→</span>
                                                                    <span className='text-emerald-600 font-bold truncate max-w-[150px]'>{String(values.n ?? 'NULL')}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className='flex items-center justify-between pt-2 border-t border-dashed border-muted-foreground/5'>
                                                <div className='flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground/40'>
                                                    <User className='size-3' /> {t('equipmentTooling.drawings.audit.operator')}: {log.operator}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <DialogFooter className='p-6 sm:p-8 bg-muted/5 border-t border-dashed border-muted-foreground/10 shrink-0'>
                        <Button variant='ghost' className='w-full rounded-full h-11 font-black text-[10px] uppercase tracking-widest text-muted-foreground/40' onClick={() => setIsLogOpen(false)}>
                            {t('equipmentTooling.drawings.audit.close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
