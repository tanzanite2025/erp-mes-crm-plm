'use client'

import { useState } from 'react'
import { Plus, Search, Thermometer, Edit2, Zap, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { toast } from 'sonner'
import { FurnaceActionDialog } from '../components/furnace-action-dialog'
import { useAssets } from '../hooks/use-assets'
import { useDashboardStats } from '../hooks/use-dashboard-stats'
import { FurnaceStatsHeader } from '../components/furnace/furnace-stats-header'
import { type Furnace, type FurnaceStatus } from '../data/schema'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { useLanguage } from '@/context/language-provider'
import { type DeltaSet } from '@/lib/delta/types'

export function FurnaceMgmt() {
  const { t } = useLanguage()
  const { runConfirmedAction } = useConfirmedActionFlow()
  const { furnaceStats, furnaces } = useDashboardStats()
  const { updateFurnaces } = useAssets()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFurnace, setEditingFurnace] = useState<Furnace | null>(null)

  const saveFurnace = (furnace: Furnace, isPatch?: boolean, delta?: DeltaSet) => {
    updateFurnaces(furnace, isPatch, delta)
  }

  const handleAddFurnace = () => {
    runConfirmedAction({
      permission: 'action_equipment_furnace_manage',
      onAction: () => {
        setEditingFurnace(null)
        setIsDialogOpen(true)
      },
    })
  }

  const handleEditFurnace = (furnace: Furnace) => {
    runConfirmedAction({
      permission: 'action_equipment_furnace_manage',
      onAction: () => {
        setEditingFurnace(furnace)
        setIsDialogOpen(true)
      },
    })
  }

  const handleConfirm = (data: Furnace, isPatch?: boolean, delta?: DeltaSet) => {
    runConfirmedAction({
      permission: 'action_equipment_furnace_manage',
      onAction: async () => {
        await saveFurnace(data, isPatch, delta)
        toast.success(
          editingFurnace
            ? t('equipmentTooling.furnaces.toast.updated')
            : t('equipmentTooling.furnaces.toast.created')
        )
      },
    })
  }

  const getStatusInfo = (status: FurnaceStatus) => {
    switch (status) {
      case 'IDLE':
        return { label: t('equipmentTooling.furnaces.status.idle'), color: 'bg-slate-500/10 text-slate-600 border-slate-200' }
      case 'HEATING':
        return { label: t('equipmentTooling.furnaces.status.heating'), color: 'bg-slate-500/10 text-slate-500 border-slate-200' }
      case 'COOLING':
        return { label: t('equipmentTooling.furnaces.status.cooling'), color: 'bg-slate-500/10 text-slate-500 border-slate-200' }
      case 'MAINTENANCE':
        return { label: t('equipmentTooling.furnaces.status.maintenance'), color: 'bg-amber-500/10 text-amber-600 border-amber-200' }
      case 'FAULT':
        return { label: t('equipmentTooling.furnaces.status.fault'), color: 'bg-rose-500/10 text-rose-600 border-rose-200 animate-pulse' }
      default:
        return { label: t('equipmentTooling.furnaces.status.unknown'), color: 'bg-slate-100 text-slate-500 border-slate-200' }
    }
  }

  const filteredFurnaces = furnaces.filter((furnace) => {
    const keyword = searchTerm.toLowerCase()
    return (
      furnace.sn.toLowerCase().includes(keyword) ||
      furnace.name.toLowerCase().includes(keyword) ||
      furnace.type.toLowerCase().includes(keyword)
    )
  })

  return (
    <div className='flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Thermometer}
        title={t('equipmentTooling.furnaces.page.title')}
        description={t('equipmentTooling.furnaces.page.description')}
        className='gap-1.5 p-5 md:p-6'
      />

      <FurnaceStatsHeader stats={furnaceStats} />

      <div className='flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-muted/5 p-4 sm:p-5 rounded-[24px] border border-dashed'>
        <div className='relative w-full md:max-w-sm'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
          <Input
            placeholder={t('equipmentTooling.furnaces.page.searchPlaceholder')}
            className='pl-11 h-12 rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 text-sm font-bold shadow-inner w-full'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button
          onClick={handleAddFurnace}
          className='rounded-full h-12 px-8 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all w-full md:w-auto shrink-0'
        >
          <Plus className='size-4 mr-2' />
          {t('equipmentTooling.furnaces.actions.add')}
        </Button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {filteredFurnaces.map((furnace) => {
          const status = getStatusInfo(furnace.status)

          return (
            <Card
              key={furnace.id}
              className='group transition-all rounded-[24px] border-dashed bg-muted/5 border-muted/50 overflow-hidden hover:bg-white hover:shadow-2xl duration-300'
            >
              <CardHeader className='pb-3 px-5 sm:px-6 pt-6'>
                <div className='flex items-start justify-between'>
                  <div className='space-y-1.5'>
                    <div className='flex items-center gap-2'>
                      <Badge
                        variant='outline'
                        className={`text-[7px] sm:text-[8px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 border-none shadow-sm ${status.color}`}
                      >
                        {status.label}
                      </Badge>
                      <span className='text-[8px] font-mono font-black text-muted-foreground/40 uppercase tracking-tighter bg-white/50 px-1.5 py-0.5 rounded'>
                        {furnace.sn}
                      </span>
                    </div>
                    <CardTitle className='text-base sm:text-lg font-black tracking-tighter text-slate-700 truncate max-w-[150px] sm:max-w-none'>
                      {furnace.name}
                    </CardTitle>
                  </div>

                  <div className='flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors'
                      onClick={() => handleEditFurnace(furnace)}
                    >
                      <Edit2 className='size-3.5' />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className='space-y-5 px-5 sm:px-6 pb-6'>
                <div className='grid grid-cols-2 gap-y-3 pt-2 border-t border-dashed border-muted-foreground/5'>
                  <div className='flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
                    <Zap className='size-3 text-orange-500/60' />
                    {t('equipmentTooling.furnaces.card.type')}
                  </div>
                  <div className='font-black text-right text-[10px] text-slate-600 truncate'>
                    {furnace.type}
                  </div>

                  <div className='flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
                    <MapPin className='size-3 text-blue-500/60' />
                    {t('equipmentTooling.furnaces.card.location')}
                  </div>
                  <div className='font-black text-right text-[10px] text-slate-600 truncate'>
                    {furnace.location || t('equipmentTooling.furnaces.card.none')}
                  </div>
                </div>

                <div className='space-y-2 pt-4 border-t border-dashed border-muted-foreground/10'>
                  <div className='flex items-center justify-between'>
                    <span className='flex items-center gap-2 text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest'>
                      <Thermometer className='size-3' />
                      {t('equipmentTooling.furnaces.card.tempLive')}
                    </span>
                    <span className='font-black font-mono tracking-tighter text-[10px] text-slate-400'>
                      {t('equipmentTooling.furnaces.card.maxTemp', { value: furnace.maxTemp })}
                    </span>
                  </div>
                  <div className='h-1.5 bg-muted/50 rounded-full overflow-hidden shadow-inner'>
                    <div className='h-full bg-slate-300/50 transition-all duration-1000' style={{ width: '0%' }} />
                  </div>
                  <p className='text-[7px] font-black text-muted-foreground/20 uppercase tracking-[0.2em] text-center italic mt-1'>
                    {t('equipmentTooling.furnaces.card.sensorOffline')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <FurnaceActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConfirm={handleConfirm}
        editData={editingFurnace}
      />
    </div>
  )
}
