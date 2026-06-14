'use client'

import { useState } from 'react'
import { Edit2, MapPin, Plus, Search, Thermometer, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { MaintenanceRecordList } from '@/features/equipment-tooling/components/maintenance-record-list'
import {
  type Furnace,
  type FurnaceStatus,
} from '@/features/equipment-tooling/data/schema'
import { useAssets } from '@/features/equipment-tooling/hooks/use-assets'
import { useDashboardStats } from '@/features/equipment-tooling/hooks/use-dashboard-stats'
import { FurnaceActionDialog } from '../components/furnace-action-dialog'
import { FurnaceStatsHeader } from '../components/furnace/furnace-stats-header'

export function FurnaceAssetsCenterPage() {
  const { t } = useLanguage()
  const { runConfirmedAction } = useConfirmedActionFlow()
  const { furnaceStats, furnaces } = useDashboardStats()
  const { updateFurnaces } = useAssets()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFurnace, setEditingFurnace] = useState<Furnace | null>(null)

  const saveFurnace = (
    furnace: Furnace,
    isPatch?: boolean,
    delta?: DeltaSet
  ) => {
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

  const handleConfirm = (
    data: Furnace,
    isPatch?: boolean,
    delta?: DeltaSet
  ) => {
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
        return {
          label: t('equipmentTooling.furnaces.status.idle'),
          color: 'bg-slate-500/10 text-slate-600 border-slate-200',
        }
      case 'HEATING':
        return {
          label: t('equipmentTooling.furnaces.status.heating'),
          color: 'bg-slate-500/10 text-slate-500 border-slate-200',
        }
      case 'COOLING':
        return {
          label: t('equipmentTooling.furnaces.status.cooling'),
          color: 'bg-slate-500/10 text-slate-500 border-slate-200',
        }
      case 'MAINTENANCE':
        return {
          label: t('equipmentTooling.furnaces.status.maintenance'),
          color: 'bg-amber-500/10 text-amber-600 border-amber-200',
        }
      case 'FAULT':
        return {
          label: t('equipmentTooling.furnaces.status.fault'),
          color: 'bg-rose-500/10 text-rose-600 border-rose-200 animate-pulse',
        }
      default:
        return {
          label: t('equipmentTooling.furnaces.status.unknown'),
          color: 'bg-slate-100 text-slate-500 border-slate-200',
        }
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
    <div className='flex animate-in flex-col gap-6 duration-700 fade-in md:gap-8'>
      <IndustrialHeader
        icon={Thermometer}
        title={t('equipmentTooling.furnaces.page.title')}
        description={t('equipmentTooling.furnaces.page.description')}
        className='gap-1.5 p-5 md:p-6'
      />

      <FurnaceStatsHeader stats={furnaceStats} />

      <div className='flex flex-col items-stretch justify-between gap-4 rounded-[24px] border border-dashed bg-muted/5 p-4 sm:p-5 md:flex-row md:items-center'>
        <div className='relative w-full md:max-w-sm'>
          <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            placeholder={t('equipmentTooling.furnaces.page.searchPlaceholder')}
            className='h-12 w-full rounded-2xl border-none bg-muted/50 pl-11 text-sm font-bold shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button
          onClick={handleAddFurnace}
          className='h-12 w-full shrink-0 rounded-full px-8 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95 md:w-auto'
        >
          <Plus className='mr-2 size-4' />
          {t('equipmentTooling.furnaces.actions.add')}
        </Button>
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {filteredFurnaces.map((furnace) => {
          const status = getStatusInfo(furnace.status)

          return (
            <Card
              key={furnace.id}
              className='group overflow-hidden rounded-[24px] border-dashed border-muted/50 bg-muted/5 transition-all duration-300 hover:bg-white hover:shadow-2xl'
            >
              <CardHeader className='px-5 pt-6 pb-3 sm:px-6'>
                <div className='flex items-start justify-between'>
                  <div className='space-y-1.5'>
                    <div className='flex items-center gap-2'>
                      <Badge
                        variant='outline'
                        className={`rounded-full border-none px-2 py-0.5 text-[7px] font-black tracking-widest uppercase shadow-sm sm:text-[8px] ${status.color}`}
                      >
                        {status.label}
                      </Badge>
                      <span className='rounded bg-white/50 px-1.5 py-0.5 font-mono text-[8px] font-black tracking-tighter text-muted-foreground/40 uppercase'>
                        {furnace.sn}
                      </span>
                    </div>
                    <CardTitle className='max-w-[150px] truncate text-base font-black tracking-tighter text-slate-700 sm:max-w-none sm:text-lg'>
                      {furnace.name}
                    </CardTitle>
                  </div>

                  <div className='flex items-center gap-1 opacity-100 transition-all md:opacity-0 md:group-hover:opacity-100'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8 rounded-xl transition-colors hover:bg-blue-50 hover:text-blue-600'
                      onClick={() => handleEditFurnace(furnace)}
                    >
                      <Edit2 className='size-3.5' />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className='px-5 pb-6 sm:px-6'>
                <Tabs defaultValue='info' className='w-full'>
                  <TabsList className='mb-4 grid w-full grid-cols-2'>
                    <TabsTrigger value='info' className='text-xs'>
                      基本信息
                    </TabsTrigger>
                    <TabsTrigger value='maintenance' className='text-xs'>
                      维保记录
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value='info' className='mt-0 space-y-5'>
                    <div className='grid grid-cols-2 gap-y-3 border-t border-dashed border-muted-foreground/5 pt-2'>
                      <div className='flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                        <Zap className='size-3 text-orange-500/60' />
                        {t('equipmentTooling.furnaces.card.type')}
                      </div>
                      <div className='truncate text-right text-[10px] font-black text-slate-600'>
                        {furnace.type}
                      </div>

                      <div className='flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                        <MapPin className='size-3 text-blue-500/60' />
                        {t('equipmentTooling.furnaces.card.location')}
                      </div>
                      <div className='truncate text-right text-[10px] font-black text-slate-600'>
                        {furnace.location ||
                          t('equipmentTooling.furnaces.card.none')}
                      </div>
                    </div>

                    <div className='space-y-2 border-t border-dashed border-muted-foreground/10 pt-4'>
                      <div className='flex items-center justify-between'>
                        <span className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                          <Thermometer className='size-3' />
                          {t('equipmentTooling.furnaces.card.tempLive')}
                        </span>
                        <span className='font-mono text-[10px] font-black tracking-tighter text-slate-400'>
                          {t('equipmentTooling.furnaces.card.maxTemp', {
                            value: furnace.maxTemp,
                          })}
                        </span>
                      </div>
                      <div className='h-1.5 overflow-hidden rounded-full bg-muted/50 shadow-inner'>
                        <div
                          className='h-full bg-slate-300/50 transition-all duration-1000'
                          style={{ width: '0%' }}
                        />
                      </div>
                      <p className='mt-1 text-center text-[7px] font-black tracking-[0.2em] text-muted-foreground/20 uppercase italic'>
                        {t('equipmentTooling.furnaces.card.sensorOffline')}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value='maintenance' className='mt-0'>
                    <MaintenanceRecordList
                      assetType='FURNACE'
                      assetId={furnace.id}
                      assetSn={furnace.sn}
                    />
                  </TabsContent>
                </Tabs>
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
