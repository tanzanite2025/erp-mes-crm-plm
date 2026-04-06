'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Factory, Globe, User, Phone, MapPin, Building2 } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { type EquipmentPartner } from '../data/schema'
import { EquipmentPartnerService } from '../services/partner-service'
import { toast } from 'sonner'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'

export function PartnerMgmt() {
    const { t } = useLanguage()
    const { runConfirmedAction } = useConfirmedActionFlow()
    const [partners, setPartners] = useState<EquipmentPartner[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<unknown>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingPartner, setEditingPartner] = useState<EquipmentPartner | null>(null)
    const [formData, setFormData] = useState<Partial<EquipmentPartner>>({
        name: '',
        type: 'INTERNAL',
        contactPerson: '',
        phone: '',
        address: '',
    })
    const loadFailedLabel = t('equipmentTooling.partners.toast.loadFailed')

    const loadData = async () => {
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
    }

    useEffect(() => {
        let cancelled = false

        void (async () => {
            setIsLoading(true)
            setError(null)
            setLoadError(null)
            try {
                const data = await EquipmentPartnerService.getPartners()
                if (!cancelled) {
                    setPartners(data)
                }
            } catch (error) {
                if (!cancelled) {
                    setError(error)
                    setLoadError(error instanceof Error ? error.message : loadFailedLabel)
                    if (!isForbiddenError(error)) {
                        toast.error(loadFailedLabel)
                    }
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        })()

        return () => {
            cancelled = true
        }
    }, [loadFailedLabel])

    const handleAdd = () => {
        runConfirmedAction({
            permission: 'action_equipment_partner_manage',
            onAction: () => {
                setEditingPartner(null)
                setFormData({ name: '', type: 'INTERNAL', contactPerson: '', phone: '', address: '' })
                setIsDialogOpen(true)
            }
        })
    }

    const handleEdit = (partner: EquipmentPartner) => {
        runConfirmedAction({
            permission: 'action_equipment_partner_manage',
            onAction: () => {
                setEditingPartner(partner)
                setFormData(partner)
                setIsDialogOpen(true)
            }
        })
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

    const handleSave = () => {
        runConfirmedAction({
            permission: 'action_equipment_partner_manage',
            onAction: async () => {
                if (!formData.name) {
                    toast.error(t('equipmentTooling.partners.validation.nameRequired'))
                    return
                }

                const partner: EquipmentPartner = {
                    id: editingPartner?.id || '',
                    name: formData.name,
                    type: (formData.type as EquipmentPartner['type']) || 'INTERNAL',
                    contactPerson: formData.contactPerson || '',
                    phone: formData.phone || '',
                    address: formData.address || '',
                    createdAt: editingPartner?.createdAt || new Date().toISOString(),
                }

                await EquipmentPartnerService.upsertPartner(partner)
                toast.success(editingPartner ? t('equipmentTooling.partners.toast.updated') : t('equipmentTooling.partners.toast.created'))
                setIsDialogOpen(false)
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className='w-[95vw] sm:max-w-md max-h-[92vh] flex flex-col p-0 rounded-[32px] shadow-2xl border-none overflow-hidden'>
                    <DialogHeader className='p-6 sm:p-8 shrink-0 pb-4 bg-primary/5 border-b border-dashed'>
                        <DialogTitle className='text-xl font-black tracking-tighter flex items-center gap-2'>
                            <Factory className='size-6 text-blue-600' />
                            {editingPartner ? t('equipmentTooling.partners.dialog.title.edit') : t('equipmentTooling.partners.dialog.title.create')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className='flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar space-y-6'>
                        <div className='space-y-2'>
                            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('equipmentTooling.partners.dialog.fields.name')}</Label>
                            <Input className='h-12 rounded-2xl border-none bg-muted/50 font-bold' placeholder={t('equipmentTooling.partners.dialog.placeholders.name')} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('equipmentTooling.partners.dialog.fields.type')}</Label>
                            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as EquipmentPartner['type'] })}>
                                <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 focus:ring-blue-500/20 font-bold'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className='rounded-2xl border-none shadow-2xl'>
                                    <SelectItem value='INTERNAL' className='rounded-xl font-bold'>{t('equipmentTooling.partners.types.internal')}</SelectItem>
                                    <SelectItem value='EXTERNAL' className='rounded-xl font-bold'>{t('equipmentTooling.partners.types.external')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            <div className='space-y-2'>
                                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('equipmentTooling.partners.dialog.fields.contact')}</Label>
                                <Input className='h-12 rounded-2xl border-none bg-muted/50 font-bold' placeholder={t('equipmentTooling.partners.dialog.placeholders.contact')} value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('equipmentTooling.partners.dialog.fields.phone')}</Label>
                                <Input className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-bold' placeholder={t('equipmentTooling.partners.dialog.placeholders.phone')} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ml-1'>{t('equipmentTooling.partners.dialog.fields.address')}</Label>
                            <Input className='h-12 rounded-2xl border-none bg-muted/50 font-bold' placeholder={t('equipmentTooling.partners.dialog.placeholders.address')} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                        </div>
                    </div>

                    <DialogFooter className='p-6 sm:p-8 bg-muted/5 border-t border-dashed border-muted-foreground/10 flex flex-row sm:justify-end gap-3 shrink-0'>
                        <Button variant='ghost' className='flex-1 sm:flex-none rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest text-muted-foreground/60' onClick={() => setIsDialogOpen(false)}>
                            {t('equipmentTooling.partners.dialog.actions.cancel')}
                        </Button>
                        <Button onClick={handleSave} className='flex-1 sm:flex-none rounded-full h-11 px-10 bg-blue-600 hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all'>
                            {t('equipmentTooling.partners.dialog.actions.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
