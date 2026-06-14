'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Edit2,
  Trash2,
  Factory,
  Globe,
  User,
  Phone,
  MapPin,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ForbiddenState } from '@/components/forbidden-state'
import { PartnerActionDialog } from '../components/partner-action-dialog'
import { type EquipmentPartner } from '../data/schema'
import { EquipmentPartnerService } from '../services/partner-service'

export function PartnerMgmt() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { runConfirmedAction } = useConfirmedActionFlow()
  const [partners, setPartners] = useState<EquipmentPartner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<EquipmentPartner | null>(
    null
  )
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
      },
    })
  }

  const handleEdit = (partner: EquipmentPartner) => {
    runConfirmedAction({
      permission: 'action_equipment_partner_update',
      onAction: () => {
        setEditingPartner(partner)
        setIsDialogOpen(true)
      },
    })
  }

  const mutation = useMutation({
    mutationFn: async ({
      data,
      isPatch,
      delta,
    }: {
      data: EquipmentPartner
      isPatch?: boolean
      delta?: DeltaSet
    }) => {
      if (isPatch && delta && editingPartner) {
        return EquipmentPartnerService.patchPartner(
          editingPartner.id,
          delta,
          editingPartner.version
        )
      }
      return EquipmentPartnerService.upsertPartner(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipmentPartners'] })
      toast.success(
        editingPartner
          ? t('equipmentTooling.partners.toast.updated')
          : t('equipmentTooling.partners.toast.created')
      )
      setIsDialogOpen(false)
      loadData()
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : '操作失败')
    },
  })

  const handleSave = (
    data: EquipmentPartner,
    isPatch?: boolean,
    delta?: DeltaSet
  ) => {
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
      },
    })
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-5 sm:p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <Globe className='size-4' />
          <h3 className='text-base font-black tracking-tighter uppercase italic sm:text-lg'>
            {t('equipmentTooling.partners.page.title')}
          </h3>
        </div>
        <p className='text-[8px] font-black tracking-widest text-muted-foreground uppercase opacity-60 sm:text-[9px]'>
          {t('equipmentTooling.partners.page.description')}
        </p>
      </div>

      <div className='flex items-center justify-end rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:p-5'>
        <Button
          className='h-12 w-full gap-2 rounded-full bg-blue-600 px-8 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 md:w-auto'
          onClick={handleAdd}
        >
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

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {isLoading && partners.length === 0 && (
          <div className='col-span-full flex flex-col items-center justify-center rounded-[32px] border border-dashed bg-muted/5 px-6 py-20 text-center'>
            <Building2 className='mb-4 size-12 animate-pulse text-muted-foreground/20' />
            <p className='text-[10px] font-black tracking-widest text-slate-400 uppercase'>
              {t('common.actions.loading')}
            </p>
          </div>
        )}

        {!isLoading && loadError && partners.length === 0 && (
          <div className='col-span-full flex flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-200 bg-rose-50/70 px-6 py-20 text-center'>
            <Building2 className='mb-4 size-12 text-rose-300' />
            <p className='text-[10px] font-black tracking-widest text-rose-600 uppercase'>
              {loadFailedLabel}
            </p>
            <p className='mt-2 text-xs font-bold wrap-break-word text-rose-700/80'>
              {loadError}
            </p>
            <Button
              variant='outline'
              className='mt-4 rounded-full border-dashed'
              onClick={() => {
                void loadData()
              }}
            >
              {t('common.actions.retry')}
            </Button>
          </div>
        )}

        {partners.map((partner) => (
          <Card
            key={partner.id}
            className='group overflow-hidden rounded-[24px] border-l-8 border-dashed bg-muted/5 transition-all duration-500 hover:shadow-2xl'
            style={{
              borderLeftColor:
                partner.type === 'INTERNAL' ? '#2563eb' : '#9333ea',
            }}
          >
            <CardContent className='space-y-6 p-6 sm:p-8'>
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-4'>
                  <div className='flex size-12 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/20 bg-primary/5 text-primary sm:size-14'>
                    {partner.type === 'INTERNAL' ? (
                      <Factory className='size-6 sm:size-7' />
                    ) : (
                      <Globe className='size-6 sm:size-7' />
                    )}
                  </div>
                  <div>
                    <Badge
                      variant='outline'
                      className={`h-4 rounded-full border-none text-[7px] font-black tracking-widest uppercase ${partner.type === 'INTERNAL' ? 'bg-blue-500/10 text-blue-600' : 'bg-purple-500/10 text-purple-600'}`}
                    >
                      {partner.type === 'INTERNAL'
                        ? t('equipmentTooling.partners.types.internalShort')
                        : t('equipmentTooling.partners.types.externalShort')}
                    </Badge>
                    <h3 className='max-w-[120px] truncate text-lg font-black tracking-tighter sm:max-w-none'>
                      {partner.name}
                    </h3>
                  </div>
                </div>
                <div className='flex items-center gap-1 opacity-100 transition-all md:opacity-0 md:group-hover:opacity-100'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8 rounded-xl hover:bg-slate-50'
                    onClick={() => handleEdit(partner)}
                  >
                    <Edit2 className='size-3.5' />
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8 rounded-xl text-rose-500 hover:bg-rose-50'
                    onClick={() => handleDelete(partner.id)}
                  >
                    <Trash2 className='size-3.5' />
                  </Button>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4 border-t border-dashed border-muted-foreground/10 pt-4'>
                <div className='space-y-1'>
                  <div className='flex items-center gap-1 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                    <User className='size-3' />{' '}
                    {t('equipmentTooling.partners.card.contact')}
                  </div>
                  <p className='truncate text-[11px] font-black text-slate-700'>
                    {partner.contactPerson || '-'}
                  </p>
                </div>
                <div className='space-y-1'>
                  <div className='flex items-center gap-1 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                    <Phone className='size-3' />{' '}
                    {t('equipmentTooling.partners.card.phone')}
                  </div>
                  <p className='truncate font-mono text-[11px] font-black text-slate-700'>
                    {partner.phone || '-'}
                  </p>
                </div>
              </div>

              {partner.address && (
                <div className='space-y-1 border-t border-dashed border-muted-foreground/5 pt-4'>
                  <div className='flex items-center gap-1 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                    <MapPin className='size-3' />{' '}
                    {t('equipmentTooling.partners.card.location')}
                  </div>
                  <p className='line-clamp-1 text-[10px] font-semibold text-slate-400 italic'>
                    {partner.address}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {!isLoading && !loadError && partners.length === 0 && (
          <div className='col-span-full flex flex-col items-center justify-center rounded-[32px] border border-dashed bg-muted/5 px-6 py-20 text-center'>
            <Building2 className='mb-4 size-12 text-muted-foreground/20' />
            <p className='text-[10px] font-black tracking-widest text-slate-400 uppercase'>
              {t('equipmentTooling.partners.empty.title')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
