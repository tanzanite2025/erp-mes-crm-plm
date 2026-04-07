'use client'

import { useState } from 'react'
import { Database, Box, Plus, Edit2, Trash2, Search, Link2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { MoldActionDialog } from '../components/mold-action-dialog'
import { useAssets } from '../services/asset-service'
import { createMoldDraft, type Mold, type MoldStatus } from '../data/schema'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { useMoldGroups } from '../hooks/use-mold-groups'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { useLanguage } from '@/context/language-provider'

export function MoldMgmt() {
    const { t } = useLanguage()
    const isMobile = useIsMobile()
    const { runConfirmedAction } = useConfirmedActionFlow()
    const { molds, updateMolds } = useAssets()
    const [searchTerm, setSearchTerm] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingMold, setEditingMold] = useState<Mold | null>(null)

    const { groupNames, groupedMolds, groupToProducts } = useMoldGroups(molds, searchTerm)

    const saveMolds = (newMolds: Mold[]) => {
        updateMolds(newMolds)
    }

    const handleAddMold = () => {
        runConfirmedAction({
            permission: 'action_equipment_mold_manage',
            onAction: () => {
                setEditingMold(null)
                setIsDialogOpen(true)
            }
        })
    }

    const handleEditMold = (mold: Mold) => {
        runConfirmedAction({
            permission: 'action_equipment_mold_manage',
            onAction: () => {
                setEditingMold(mold)
                setIsDialogOpen(true)
            }
        })
    }

    const handleDeleteMold = (id: string) => {
        runConfirmedAction({
            permission: 'action_equipment_mold_manage',
            confirmKey: 'equipmentTooling.molds.confirm.remove',
            onAction: () => {
                saveMolds(molds.filter((m) => m.id !== id))
                toast.info(t('equipmentTooling.molds.toast.removed'))
            }
        })
    }

    const handleConfirm = (data: Mold) => {
        runConfirmedAction({
            permission: 'action_equipment_mold_manage',
            onAction: () => {
                if (editingMold) {
                    saveMolds(molds.map((m) => (m.id === editingMold.id ? data : m)))
                    toast.success(t('equipmentTooling.molds.toast.updated'))
                } else {
                    saveMolds([...molds, data])
                    toast.success(t('equipmentTooling.molds.toast.created'))
                }
            }
        })
    }

    const getStatusInfo = (status: MoldStatus) => {
        switch (status) {
            case 'IDLE':
                return { label: t('equipmentTooling.molds.status.idle'), color: 'bg-slate-500/10 text-slate-600 border-slate-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]' }
            case 'IN_USE':
                return { label: t('equipmentTooling.molds.status.inUse'), color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' }
            case 'CHECKING':
                return { label: t('equipmentTooling.molds.status.checking'), color: 'bg-amber-500/10 text-amber-600 border-amber-200 animate-pulse' }
            case 'MAINTENANCE':
                return { label: t('equipmentTooling.molds.status.maintenance'), color: 'bg-rose-500/10 text-rose-600 border-rose-200' }
            case 'RETIRED':
                return { label: t('equipmentTooling.molds.status.retired'), color: 'bg-zinc-500/10 text-zinc-400 border-zinc-200 grayscale' }
            case 'LENT_OUT':
                return { label: t('equipmentTooling.molds.status.lentOut'), color: 'bg-blue-500/10 text-blue-600 border-blue-200' }
            case 'BORROWED':
                return { label: t('equipmentTooling.molds.status.borrowed'), color: 'bg-purple-500/10 text-purple-600 border-purple-200' }
            default:
                return { label: t('equipmentTooling.molds.status.unknown'), color: 'bg-slate-100 text-slate-400' }
        }
    }

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            <div className='flex flex-col gap-1 bg-muted/5 p-5 sm:p-6 rounded-[32px] border border-dashed border-muted/50'>
                <div className='flex items-center gap-2 text-primary'>
                    <Database className='size-4' />
                    <h3 className='text-base sm:text-lg font-black tracking-tighter italic uppercase'>{t('equipmentTooling.molds.page.title')}</h3>
                </div>
                <p className='text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>{t('equipmentTooling.molds.page.description')}</p>
            </div>

            <div className='flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-muted/5 p-4 sm:p-5 rounded-[24px] border border-dashed'>
                <div className='relative w-full md:w-[400px] group'>
                    <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary' />
                    <Input
                        placeholder={t('equipmentTooling.molds.page.searchPlaceholder')}
                        className='pl-11 h-12 w-full rounded-2xl border-none bg-muted/50 font-bold text-xs shadow-inner focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30'
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Button onClick={handleAddMold} className='rounded-full bg-primary h-12 px-8 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 w-full md:w-auto shrink-0'>
                    <Plus className='size-3.5 mr-2' /> {t('equipmentTooling.molds.actions.add')}
                </Button>
            </div>

            <div className='space-y-4'>
                <Accordion type='multiple' defaultValue={groupNames}>
                    {groupNames.map((group) => {
                        const groupMolds = groupedMolds[group]
                        const totalMolds = groupMolds.length
                        const alertCount = groupMolds.filter((m) => m.currentCycles >= m.maintenanceThreshold).length
                        const overCount = groupMolds.filter((m) => m.currentCycles >= m.maxCycles).length

                        return (
                            <AccordionItem key={group} value={group} className='border-none shadow-none bg-transparent mb-6'>
                                <AccordionTrigger className='hover:no-underline p-0'>
                                    <div className='flex items-center justify-between w-full pr-4 sm:pr-6 py-4 bg-muted/5 rounded-[24px] border border-dashed px-4 sm:px-6 group/trigger transition-all hover:bg-muted/10 gap-4'>
                                        <div className='flex items-center gap-3 sm:gap-4 min-w-0'>
                                            <div className='size-9 sm:size-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 group-hover/trigger:scale-110'>
                                                <Database className='size-5 text-primary' />
                                            </div>
                                            <div className='text-left min-w-0'>
                                                <div className='flex items-center gap-2 sm:gap-3 flex-wrap'>
                                                    <h4 className='text-xs font-black text-foreground uppercase tracking-tight truncate'>{group}</h4>
                                                    <Badge variant='outline' className='h-4 px-1.5 py-0 text-[8px] sm:text-[9px] bg-muted/40 text-muted-foreground font-black border-none uppercase whitespace-nowrap'>
                                                        {t('equipmentTooling.molds.group.assets', { count: totalMolds })}
                                                    </Badge>
                                                </div>
                                                <p className='text-[8px] text-muted-foreground/40 font-bold uppercase tracking-widest mt-0.5 truncate'>{t('equipmentTooling.molds.group.grouping')}</p>
                                            </div>
                                        </div>

                                        <div className='flex items-center gap-4 sm:gap-6 shrink-0'>
                                            <div className='hidden sm:flex items-center gap-2'>
                                                <span className='text-[9px] text-muted-foreground/40 font-black uppercase tracking-widest'>{t('equipmentTooling.molds.group.sku')}</span>
                                                {groupToProducts[group] ? (
                                                    <div className='flex gap-1'>
                                                        {groupToProducts[group].slice(0, 2).map((sku) => (
                                                            <Badge key={sku} variant='outline' className='text-[8px] h-4 px-1 bg-primary/5 text-primary border-primary/10 font-black'>
                                                                {sku}
                                                            </Badge>
                                                        ))}
                                                        {groupToProducts[group].length > 2 && <span className='text-[9px] text-muted-foreground font-black'>+{groupToProducts[group].length - 2}</span>}
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className='flex items-center gap-2'>
                                                {overCount > 0 ? (
                                                    <Badge className='bg-rose-500 text-white border-none text-[8px] h-4 font-black uppercase tracking-tighter'>{t('equipmentTooling.molds.group.expired', { count: overCount })}</Badge>
                                                ) : alertCount > 0 ? (
                                                    <Badge className='bg-amber-500 text-white border-none text-[8px] h-4 font-black uppercase tracking-tighter'>{t('equipmentTooling.molds.group.maintain', { count: alertCount })}</Badge>
                                                ) : (
                                                    <Badge className='bg-emerald-500/10 text-emerald-600 border-none text-[8px] h-4 font-black uppercase tracking-tighter'>{t('equipmentTooling.molds.group.healthy')}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className='pt-4 pb-2 px-1'>
                                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                                        {groupMolds.map((mold) => {
                                            const status = getStatusInfo(mold.status)
                                            const usageRate = Math.min(Math.round((mold.currentCycles / mold.maxCycles) * 100), 100)
                                            const isMaintenanceNeeded = mold.currentCycles >= mold.maintenanceThreshold
                                            const isOver = mold.currentCycles >= mold.maxCycles

                                            return (
                                                <Card key={mold.id} className={cn('group hover:shadow-2xl hover:shadow-primary/5 transition-all border-dashed rounded-[24px] bg-muted/5 relative overflow-hidden flex flex-col min-h-[260px]', isMobile ? 'p-0' : '')}>
                                                    <div className={cn('absolute top-0 left-0 w-1.5 h-full', isOver ? 'bg-rose-500' : isMaintenanceNeeded ? 'bg-amber-500' : 'bg-primary')} />

                                                    <CardHeader className='pb-2 pt-6 px-5 sm:px-6'>
                                                        <div className='flex items-start justify-between gap-4'>
                                                            <div className='flex flex-col gap-3 min-w-0'>
                                                                <div className='flex items-center gap-2 flex-wrap'>
                                                                    <Badge variant='outline' className={cn('h-5 border-none font-black text-[8px] sm:text-[9px] uppercase px-2 rounded-md', status.color)}>
                                                                        {status.label}
                                                                    </Badge>
                                                                    <span className='text-[9px] text-muted-foreground/40 font-mono bg-muted/50 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter whitespace-nowrap'>
                                                                        {t('equipmentTooling.molds.card.sn', { sn: mold.sn })}
                                                                    </span>
                                                                </div>
                                                                <div className='flex items-center gap-3'>
                                                                    {mold.imageUrl && (
                                                                        <div className='size-11 sm:size-12 rounded-2xl overflow-hidden border border-dashed border-muted bg-white shrink-0 p-1'>
                                                                            <img src={mold.imageUrl} alt={mold.name} className='w-full h-full object-cover rounded-xl' />
                                                                        </div>
                                                                    )}
                                                                    <div className='flex flex-col min-w-0'>
                                                                        <CardTitle className='text-sm font-black text-foreground group-hover:text-primary transition-colors leading-tight truncate uppercase tracking-tighter'>{mold.name}</CardTitle>
                                                                        <span className='text-[8px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-0.5 truncate'>{t('equipmentTooling.molds.card.masterSpec')}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className='flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all translate-x-0 md:translate-x-2 md:group-hover:translate-x-0 shrink-0'>
                                                                <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-primary/10 hover:text-primary' onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleEditMold(mold)
                                                                }}>
                                                                    <Edit2 className='size-3.5' />
                                                                </Button>
                                                                <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-rose-500/10 hover:text-rose-500' onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleDeleteMold(mold.id)
                                                                }}>
                                                                    <Trash2 className='size-3.5' />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </CardHeader>

                                                    <CardContent className='px-5 sm:px-6 pb-6 flex-1 flex flex-col justify-between gap-6'>
                                                        <div className='grid grid-cols-2 gap-y-2 text-[10px] pt-4 border-t border-dashed border-muted-foreground/10'>
                                                            <div className='text-muted-foreground/40 font-black uppercase tracking-widest flex items-center gap-2'>
                                                                <Link2 className='size-3 opacity-50' /> {t('equipmentTooling.molds.card.sku')}
                                                            </div>
                                                            <div className='font-black text-right text-primary/80 truncate'>
                                                                {mold.groupName && groupToProducts[mold.groupName] ? groupToProducts[mold.groupName].join(', ') : <span className='text-muted-foreground/20 italic font-black'>{t('equipmentTooling.molds.card.unset')}</span>}
                                                            </div>

                                                            <div className='text-muted-foreground/40 font-black uppercase tracking-widest flex items-center gap-2'>
                                                                <Box className='size-3 opacity-50' /> {t('equipmentTooling.molds.card.location')}
                                                            </div>
                                                            <div className='font-black text-right text-foreground/60 truncate uppercase'>{mold.location || t('equipmentTooling.molds.card.pendingLocation')}</div>
                                                        </div>

                                                        <div className='space-y-3 pt-4 border-t border-dashed border-muted-foreground/10'>
                                                            <div className='flex items-center justify-between text-[9px] font-black uppercase tracking-widest'>
                                                                <span className='text-muted-foreground/40'>{t('equipmentTooling.molds.card.healthIndex')}</span>
                                                                <span className={cn(isOver ? 'text-rose-600' : isMaintenanceNeeded ? 'text-amber-600' : 'text-primary')}>{usageRate}%</span>
                                                            </div>
                                                            <div className='h-1 px-0.5 bg-muted/40 rounded-full flex items-center shadow-inner'>
                                                                <div className={cn('h-0.5 rounded-full transition-all duration-1000 ease-in-out', isOver ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : isMaintenanceNeeded ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.3)]')} style={{ width: `${usageRate}%` }} />
                                                            </div>
                                                            <div className='flex justify-between items-center gap-2'>
                                                                <p className='text-[8px] text-muted-foreground/20 font-black uppercase tabular-nums truncate'>{t('equipmentTooling.molds.card.cycles', { current: mold.currentCycles, limit: mold.maxCycles })}</p>
                                                                <p className='text-[8px] text-primary/40 font-black uppercase tabular-nums shrink-0'>{t('equipmentTooling.molds.card.totalLife', { total: mold.totalLifeCycles || 0 })}</p>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )
                                        })}

                                        <Button
                                            variant='ghost'
                                            className='min-h-[260px] py-12 border-2 border-dashed border-muted/50 rounded-[24px] hover:border-primary/50 hover:bg-primary/[0.02] flex flex-col gap-3 text-muted-foreground/40 group transition-all h-full'
                                            onClick={() => {
                                                setEditingMold(createMoldDraft({
                                                    sn: `MOLD-${Date.now().toString().slice(-6)}`,
                                                    groupName: group === t('equipmentTooling.molds.defaults.uncategorized') ? '' : group,
                                                }))
                                                setIsDialogOpen(true)
                                            }}
                                        >
                                            <div className='size-12 rounded-full bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110 border border-transparent group-hover:border-primary/20'>
                                                <Plus className='size-6 group-hover:text-primary transition-colors' />
                                            </div>
                                            <span className='text-[10px] font-black uppercase tracking-widest'>{t('equipmentTooling.molds.actions.addInGroup')}</span>
                                        </Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>

                {groupNames.length === 0 && (
                    <div className='flex flex-col items-center justify-center py-20 bg-muted/5 rounded-[32px] border border-dashed px-6 text-center'>
                        <Box className='size-14 text-muted-foreground/10 mb-6' />
                        <h3 className='text-sm font-black text-foreground/40 uppercase tracking-widest'>{t('equipmentTooling.molds.empty.title')}</h3>
                        <p className='text-[10px] text-muted-foreground/30 mt-2 font-bold uppercase max-w-[240px]'>{t('equipmentTooling.molds.empty.description')}</p>
                        <Button className='mt-8 rounded-full bg-primary h-12 px-10 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 w-full xs:w-auto' onClick={handleAddMold}>
                            {t('equipmentTooling.molds.empty.init')}
                        </Button>
                    </div>
                )}
            </div>

            <MoldActionDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onConfirm={handleConfirm} editData={editingMold} />
        </div>
    )
}
