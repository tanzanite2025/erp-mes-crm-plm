'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Factory, Globe, User, Phone, MapPin, Building2 } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { PartnerActionDialog } from '../components/partner-action-dialog'
import { type EquipmentPartner } from '../data/schema'
import { EquipmentPartnerService } from '../services/partner-service'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { type DeltaSet } from '@/lib/delta/types'

export function PartnerMgmt() {
    const { t } = useLanguage()
    const queryClient = useQueryClient()
    const { runConfirmedAction } = useConfirmedActionFlow()
    const [partners, setPartners] = useState<EquipmentPartner[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<unknown>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingPartner, setEditingPartner] = useState<EquipmentPartner | null>(null)
    const loadFailedLabel = t('equipmentTooling.partners.toast.loadFailed')

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        setLoadError(null)
        try {
            const data = await EquipmentPartnerService.getPartners()
            setPartners(data)
        } catch (error) {
            setError(error)
            setLoadError(error instanceof Error ? error.message : loadFailedLabel)
            if (!isForbiddenError(error)) {
                toast.error(loadFailedLabel)
            }
        } finally {
            setIsLoading(false)
        }
    }, [loadFailedLabel])

    useEffect(() => {
        void loadData()
    }, [loadData])

    const handleAdd = () => {
        runConfirmedAction({
            permission: 'action_equipment_partner_manage',
            onAction: () => {
                setEditingPartner(null)
                setIsDialogOpen(true)
            }
        })
    }

    const handleEdit = (partner: EquipmentPartner) => {
        runConfirmedAction({
            permission: 'action_equipment_partner_manage',
            onAction: () => {
                setEditingPartner(partner)
                setIsDialogOpen(true)
            }
        })
    }

    const mutation = useMutation({
        mutationFn: async ({ 
            data, 
            isPatch, 
            delta 
        }: { 
            data: EquipmentPartner; 
            isPatch?: boolean; 
            delta?: DeltaSet 
        }) => {
            if (isPatch && delta && editingPartner) {
                return EquipmentPartnerService.patchPartner(editingPartner.id, delta, editingPartner.version)
            }
            return EquipmentPartnerService.upsertPartner(data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipmentPartners'] })
            toast.success(editingPartner ? t('equipmentTooling.partners.toast.updated') : t('equipmentTooling.partners.toast.created'))
            setIsDialogOpen(false)
            loadData()
        },
        onError: (error: any) => {
            toast.error(error.message || '操作失败')
        }
    })

    const handleSave = (data: EquipmentPartner, isPatch?: boolean, delta?: DeltaSet) => {
        mutation.mutate({ data, isPatch, delta })
    }

    const handleDelete = (id: string) => {
        runConfirmedAction({
            permission: 'action_equipment_partner_manage',
            confirmKey: 'equipmentTooling.partners.confirm.remove',
            onAction: async () => {
                await EquipmentPartnerService.deletePartner(id)
                toast.success(t('equipmentTooling.partners.toast.removed'))
                loadData()
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
                    <Globe className='size-4' />
                    <h3 className='text-base sm:text-lg font-black tracking-tighter italic uppercase'>{t('equipmentTooling.partners.page.title')}</h3>
                </div>
                <p className='text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>{t('equipmentTooling.partners.page.description')}</p>
            </div>

            <div className='flex items-center justify-end bg-muted/5 p-4 sm:p-5 rounded-[24px] border border-dashed border-muted/50'>
                <Button className='rounded-full h-12 px-8 bg-blue-600 hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-all w-full md:w-auto' onClick={handleAdd}>
                    <Plus className='size-4' />
                    {t('equipmentTooling.partners.actions.add')}
                </Button>
            </div>

            <PartnerActionDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                currentRow={editingPartner}
                onSubmit={handleSave}
            />

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {isLoading && partners.length === 0 && (
                    <div className='col-span-full py-20 flex flex-col items-center justify-center bg-muted/5 rounded-[32px] border border-dashed text-center px-6'>
                        <Building2 className='size-12 text-muted-foreground/20 mb-4 animate-pulse' />
                        <p className='text-[10px] font-black uppercase tracking-widest text-slate-400'>{t('common.actions.loading')}</p>
                    </div>
                )}

                {!isLoading && loadError && partners.length === 0 && (
                    <div className='col-span-full py-20 flex flex-col items-center justify-center bg-rose-50/70 rounded-[32px] border border-dashed border-rose-200 text-center px-6'>
                        <Building2 className='size-12 text-rose-300 mb-4' />
                        <p className='text-[10px] font-black uppercase tracking-widest text-rose-600'>{loadFailedLabel}</p>
                        <p className='mt-2 text-xs font-bold text-rose-700/80 wrap-break-word'>{loadError}</p>
                        <Button variant='outline' className='mt-4 rounded-full border-dashed' onClick={() => { void loadData() }}>
                            {t('common.actions.retry')}
                        </Button>
                    </div>
                )}

                {partners.map((partner) => (
                    <Card key={partner.id} className='group overflow-hidden hover:shadow-2xl transition-all duration-500 border-dashed rounded-[24px] border-l-8 bg-muted/5' style={{ borderLeftColor: partner.type === 'INTERNAL' ? '#2563eb' : '#9333ea' }}>
                        <CardContent className='p-6 sm:p-8 space-y-6'>
                            <div className='flex items-start justify-between'>
                                <div className='flex items-center gap-4'>
                                    <div className='size-12 sm:size-14 rounded-full bg-primary/5 border border-dashed border-primary/20 flex items-center justify-center text-primary shrink-0'>
                                        {partner.type === 'INTERNAL' ? <Factory className='size-6 sm:size-7' /> : <Globe className='size-6 sm:size-7' />}
                                    </div>
                                    <div>
                                        <Badge variant='outline' className={`rounded-full h-4 text-[7px] font-black uppercase tracking-widest border-none ${partner.type === 'INTERNAL' ? 'bg-blue-500/10 text-blue-600' : 'bg-purple-500/10 text-purple-600'}`}>
                                            {partner.type === 'INTERNAL' ? t('equipmentTooling.partners.types.internalShort') : t('equipmentTooling.partners.types.externalShort')}
                                        </Badge>
                                        <h3 className='text-lg font-black tracking-tighter truncate max-w-[120px] sm:max-w-none'>{partner.name}</h3>
                                    </div>
                                </div>
                                <div className='flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all'>
                                    <Button variant='ghost' size='icon' className='size-8 rounded-xl hover:bg-slate-50' onClick={() => handleEdit(partner)}>
                                        <Edit2 className='size-3.5' />
                                    </Button>
                                    <Button variant='ghost' size='icon' className='size-8 rounded-xl hover:bg-rose-50 text-rose-500' onClick={() => handleDelete(partner.id)}>
                                        <Trash2 className='size-3.5' />
                                    </Button>
                                </div>
                            </div>

                            <div className='grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-muted-foreground/10'>
                                <div className='space-y-1'>
                                    <div className='flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
                                        <User className='size-3' /> {t('equipmentTooling.partners.card.contact')}
                                    </div>
                                    <p className='text-[11px] font-black text-slate-700 truncate'>{partner.contactPerson || '-'}</p>
                                </div>
                                <div className='space-y-1'>
                                    <div className='flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
                                        <Phone className='size-3' /> {t('equipmentTooling.partners.card.phone')}
                                    </div>
                                    <p className='text-[11px] font-mono font-black text-slate-700 truncate'>{partner.phone || '-'}</p>
                                </div>
                            </div>

                            {partner.address && (
                                <div className='space-y-1 pt-4 border-t border-dashed border-muted-foreground/5'>
                                    <div className='flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
                                        <MapPin className='size-3' /> {t('equipmentTooling.partners.card.location')}
                                    </div>
                                    <p className='text-[10px] font-semibold text-slate-400 line-clamp-1 italic'>{partner.address}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}

                {!isLoading && !loadError && partners.length === 0 && (
                    <div className='col-span-full py-20 flex flex-col items-center justify-center bg-muted/5 rounded-[32px] border border-dashed text-center px-6'>
                        <Building2 className='size-12 text-muted-foreground/20 mb-4' />
                        <p className='text-[10px] font-black uppercase tracking-widest text-slate-400'>{t('equipmentTooling.partners.empty.title')}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
