'use client'

import { useState } from 'react'
import { Database, Box, Plus, Edit2, Search, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useIsMobile } from '@/hooks/use-mobile'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MaintenanceRecordList } from '@/features/equipment-maintenance/components/maintenance-record-list'
import { MoldActionDialog } from '../components/mold-action-dialog'
import { createMoldDraft, type Mold, type MoldStatus } from '../data/schema'
import { useAssets } from '../hooks/use-assets'
import { useMoldGroups } from '../hooks/use-mold-groups'

export function MoldMgmt() {
  const { t } = useLanguage()
  const isMobile = useIsMobile()
  const { runConfirmedAction } = useConfirmedActionFlow()
  const { molds, updateMolds } = useAssets()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMold, setEditingMold] = useState<Mold | null>(null)

  const { groupNames, groupedMolds, groupToProducts } = useMoldGroups(
    molds,
    searchTerm
  )

  const saveMold = (mold: Mold, isPatch?: boolean, delta?: DeltaSet) => {
    updateMolds(mold, isPatch, delta)
  }

  const handleAddMold = () => {
    runConfirmedAction({
      permission: 'action_equipment_mold_manage',
      onAction: () => {
        setEditingMold(null)
        setIsDialogOpen(true)
      },
    })
  }

  const handleEditMold = (mold: Mold) => {
    runConfirmedAction({
      permission: 'action_equipment_mold_manage',
      onAction: () => {
        setEditingMold(mold)
        setIsDialogOpen(true)
      },
    })
  }

  const handleConfirm = (data: Mold, isPatch?: boolean, delta?: DeltaSet) => {
    runConfirmedAction({
      permission: 'action_equipment_mold_manage',
      onAction: async () => {
        await saveMold(data, isPatch, delta)
        toast.success(
          editingMold
            ? t('equipmentTooling.molds.toast.updated')
            : t('equipmentTooling.molds.toast.created')
        )
      },
    })
  }

  const getStatusInfo = (status: MoldStatus) => {
    switch (status) {
      case 'IDLE':
        return {
          label: t('equipmentTooling.molds.status.idle'),
          color:
            'bg-slate-500/10 text-slate-600 border-slate-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]',
        }
      case 'IN_USE':
        return {
          label: t('equipmentTooling.molds.status.inUse'),
          color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        }
      case 'CHECKING':
        return {
          label: t('equipmentTooling.molds.status.checking'),
          color:
            'bg-amber-500/10 text-amber-600 border-amber-200 animate-pulse',
        }
      case 'MAINTENANCE':
        return {
          label: t('equipmentTooling.molds.status.maintenance'),
          color: 'bg-rose-500/10 text-rose-600 border-rose-200',
        }
      case 'RETIRED':
        return {
          label: t('equipmentTooling.molds.status.retired'),
          color: 'bg-zinc-500/10 text-zinc-400 border-zinc-200 grayscale',
        }
      case 'LENT_OUT':
        return {
          label: t('equipmentTooling.molds.status.lentOut'),
          color: 'bg-blue-500/10 text-blue-600 border-blue-200',
        }
      case 'BORROWED':
        return {
          label: t('equipmentTooling.molds.status.borrowed'),
          color: 'bg-purple-500/10 text-purple-600 border-purple-200',
        }
      default:
        return {
          label: t('equipmentTooling.molds.status.unknown'),
          color: 'bg-slate-100 text-slate-400',
        }
    }
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-5 sm:p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <Database className='size-4' />
          <h3 className='text-base font-black tracking-tighter uppercase italic sm:text-lg'>
            {t('equipmentTooling.molds.page.title')}
          </h3>
        </div>
        <p className='text-[8px] font-black tracking-widest text-muted-foreground uppercase opacity-60 sm:text-[9px]'>
          {t('equipmentTooling.molds.page.description')}
        </p>
      </div>

      <div className='flex flex-col items-stretch justify-between gap-4 rounded-[24px] border border-dashed bg-muted/5 p-4 sm:p-5 md:flex-row md:items-center'>
        <div className='group relative w-full md:w-[400px]'>
          <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary' />
          <Input
            placeholder={t('equipmentTooling.molds.page.searchPlaceholder')}
            className='h-12 w-full rounded-2xl border-none bg-muted/50 pl-11 text-xs font-bold shadow-inner transition-all placeholder:text-muted-foreground/30 focus:ring-2 focus:ring-primary/20'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button
          onClick={handleAddMold}
          className='h-12 w-full shrink-0 rounded-full bg-primary px-8 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-primary/20 transition-all active:scale-95 md:w-auto'
        >
          <Plus className='mr-2 size-3.5' />{' '}
          {t('equipmentTooling.molds.actions.add')}
        </Button>
      </div>

      <div className='space-y-4'>
        <Accordion type='multiple' defaultValue={groupNames}>
          {groupNames.map((group) => {
            const groupMolds = groupedMolds[group]
            const totalMolds = groupMolds.length
            const alertCount = groupMolds.filter(
              (m) => m.currentCycles >= m.maintenanceThreshold
            ).length
            const overCount = groupMolds.filter(
              (m) => m.currentCycles >= m.maxCycles
            ).length

            return (
              <AccordionItem
                key={group}
                value={group}
                className='mb-6 border-none bg-transparent shadow-none'
              >
                <AccordionTrigger className='p-0 hover:no-underline'>
                  <div className='group/trigger flex w-full items-center justify-between gap-4 rounded-[24px] border border-dashed bg-muted/5 px-4 py-4 pr-4 transition-all hover:bg-muted/10 sm:px-6 sm:pr-6'>
                    <div className='flex min-w-0 items-center gap-3 sm:gap-4'>
                      <div className='flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 group-hover/trigger:scale-110 sm:size-10'>
                        <Database className='size-5 text-primary' />
                      </div>
                      <div className='min-w-0 text-left'>
                        <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                          <h4 className='truncate text-xs font-black tracking-tight text-foreground uppercase'>
                            {group}
                          </h4>
                          <Badge
                            variant='outline'
                            className='h-4 border-none bg-muted/40 px-1.5 py-0 text-[8px] font-black whitespace-nowrap text-muted-foreground uppercase sm:text-[9px]'
                          >
                            {t('equipmentTooling.molds.group.assets', {
                              count: totalMolds,
                            })}
                          </Badge>
                        </div>
                        <p className='mt-0.5 truncate text-[8px] font-bold tracking-widest text-muted-foreground/40 uppercase'>
                          {t('equipmentTooling.molds.group.grouping')}
                        </p>
                      </div>
                    </div>

                    <div className='flex shrink-0 items-center gap-4 sm:gap-6'>
                      <div className='hidden items-center gap-2 sm:flex'>
                        <span className='text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                          {t('equipmentTooling.molds.group.sku')}
                        </span>
                        {groupToProducts[group] ? (
                          <div className='flex gap-1'>
                            {groupToProducts[group].slice(0, 2).map((sku) => (
                              <Badge
                                key={sku}
                                variant='outline'
                                className='h-4 border-primary/10 bg-primary/5 px-1 text-[8px] font-black text-primary'
                              >
                                {sku}
                              </Badge>
                            ))}
                            {groupToProducts[group].length > 2 && (
                              <span className='text-[9px] font-black text-muted-foreground'>
                                +{groupToProducts[group].length - 2}
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div className='flex items-center gap-2'>
                        {overCount > 0 ? (
                          <Badge className='h-4 border-none bg-rose-500 text-[8px] font-black tracking-tighter text-white uppercase'>
                            {t('equipmentTooling.molds.group.expired', {
                              count: overCount,
                            })}
                          </Badge>
                        ) : alertCount > 0 ? (
                          <Badge className='h-4 border-none bg-amber-500 text-[8px] font-black tracking-tighter text-white uppercase'>
                            {t('equipmentTooling.molds.group.maintain', {
                              count: alertCount,
                            })}
                          </Badge>
                        ) : (
                          <Badge className='h-4 border-none bg-emerald-500/10 text-[8px] font-black tracking-tighter text-emerald-600 uppercase'>
                            {t('equipmentTooling.molds.group.healthy')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className='px-1 pt-4 pb-2'>
                  <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                    {groupMolds.map((mold) => {
                      const status = getStatusInfo(mold.status)
                      const usageRate = Math.min(
                        Math.round((mold.currentCycles / mold.maxCycles) * 100),
                        100
                      )
                      const isMaintenanceNeeded =
                        mold.currentCycles >= mold.maintenanceThreshold
                      const isOver = mold.currentCycles >= mold.maxCycles

                      return (
                        <Card
                          key={mold.id}
                          className={cn(
                            'group relative flex flex-col overflow-hidden rounded-[24px] border-dashed bg-muted/5 transition-all hover:shadow-2xl hover:shadow-primary/5',
                            isMobile ? 'p-0' : ''
                          )}
                        >
                          <div
                            className={cn(
                              'absolute top-0 left-0 h-full w-1.5',
                              isOver
                                ? 'bg-rose-500'
                                : isMaintenanceNeeded
                                  ? 'bg-amber-500'
                                  : 'bg-primary'
                            )}
                          />

                          <CardHeader className='px-5 pt-6 pb-2 sm:px-6'>
                            <div className='flex items-start justify-between gap-4'>
                              <div className='flex min-w-0 flex-col gap-3'>
                                <div className='flex flex-wrap items-center gap-2'>
                                  <Badge
                                    variant='outline'
                                    className={cn(
                                      'h-5 rounded-md border-none px-2 text-[8px] font-black uppercase sm:text-[9px]',
                                      status.color
                                    )}
                                  >
                                    {status.label}
                                  </Badge>
                                  <span className='rounded-full bg-muted/50 px-2 py-0.5 font-mono text-[9px] font-black tracking-tighter whitespace-nowrap text-muted-foreground/40 uppercase'>
                                    {t('equipmentTooling.molds.card.sn', {
                                      sn: mold.sn,
                                    })}
                                  </span>
                                </div>
                                <div className='flex items-center gap-3'>
                                  {mold.imageUrl && (
                                    <div className='size-11 shrink-0 overflow-hidden rounded-2xl border border-dashed border-muted bg-white p-1 sm:size-12'>
                                      <img
                                        src={mold.imageUrl}
                                        alt={mold.name}
                                        className='h-full w-full rounded-xl object-cover'
                                      />
                                    </div>
                                  )}
                                  <div className='flex min-w-0 flex-col'>
                                    <CardTitle className='truncate text-sm leading-tight font-black tracking-tighter text-foreground uppercase transition-colors group-hover:text-primary'>
                                      {mold.name}
                                    </CardTitle>
                                    <span className='mt-0.5 truncate text-[8px] font-black tracking-[0.2em] text-muted-foreground/30 uppercase'>
                                      {t(
                                        'equipmentTooling.molds.card.masterSpec'
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className='flex shrink-0 translate-x-0 items-center gap-1 opacity-100 transition-all md:translate-x-2 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100'>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='size-8 rounded-full hover:bg-primary/10 hover:text-primary'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditMold(mold)
                                  }}
                                >
                                  <Edit2 className='size-3.5' />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className='flex-1 px-5 pb-6 sm:px-6'>
                            <Tabs defaultValue='info' className='w-full'>
                              <TabsList className='mb-4 grid w-full grid-cols-2'>
                                <TabsTrigger value='info' className='text-xs'>
                                  基本信息
                                </TabsTrigger>
                                <TabsTrigger
                                  value='maintenance'
                                  className='text-xs'
                                >
                                  维保记录
                                </TabsTrigger>
                              </TabsList>

                              <TabsContent
                                value='info'
                                className='mt-0 space-y-6'
                              >
                                <div className='grid grid-cols-2 gap-y-2 border-t border-dashed border-muted-foreground/10 pt-4 text-[10px]'>
                                  <div className='flex items-center gap-2 font-black tracking-widest text-muted-foreground/40 uppercase'>
                                    <Link2 className='size-3 opacity-50' />{' '}
                                    {t('equipmentTooling.molds.card.sku')}
                                  </div>
                                  <div className='truncate text-right font-black text-primary/80'>
                                    {mold.groupName &&
                                    groupToProducts[mold.groupName] ? (
                                      groupToProducts[mold.groupName].join(', ')
                                    ) : (
                                      <span className='font-black text-muted-foreground/20 italic'>
                                        {t('equipmentTooling.molds.card.unset')}
                                      </span>
                                    )}
                                  </div>

                                  <div className='flex items-center gap-2 font-black tracking-widest text-muted-foreground/40 uppercase'>
                                    <Box className='size-3 opacity-50' />{' '}
                                    {t('equipmentTooling.molds.card.location')}
                                  </div>
                                  <div className='truncate text-right font-black text-foreground/60 uppercase'>
                                    {mold.location ||
                                      t(
                                        'equipmentTooling.molds.card.pendingLocation'
                                      )}
                                  </div>
                                </div>

                                <div className='space-y-3 border-t border-dashed border-muted-foreground/10 pt-4'>
                                  <div className='flex items-center justify-between text-[9px] font-black tracking-widest uppercase'>
                                    <span className='text-muted-foreground/40'>
                                      {t(
                                        'equipmentTooling.molds.card.healthIndex'
                                      )}
                                    </span>
                                    <span
                                      className={cn(
                                        isOver
                                          ? 'text-rose-600'
                                          : isMaintenanceNeeded
                                            ? 'text-amber-600'
                                            : 'text-primary'
                                      )}
                                    >
                                      {usageRate}%
                                    </span>
                                  </div>
                                  <div className='flex h-1 items-center rounded-full bg-muted/40 px-0.5 shadow-inner'>
                                    <div
                                      className={cn(
                                        'h-0.5 rounded-full transition-all duration-1000 ease-in-out',
                                        isOver
                                          ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                          : isMaintenanceNeeded
                                            ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                                            : 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                                      )}
                                      style={{ width: `${usageRate}%` }}
                                    />
                                  </div>
                                  <div className='flex items-center justify-between gap-2'>
                                    <p className='truncate text-[8px] font-black text-muted-foreground/20 uppercase tabular-nums'>
                                      {t('equipmentTooling.molds.card.cycles', {
                                        current: mold.currentCycles,
                                        limit: mold.maxCycles,
                                      })}
                                    </p>
                                    <p className='shrink-0 text-[8px] font-black text-primary/40 uppercase tabular-nums'>
                                      {t(
                                        'equipmentTooling.molds.card.totalLife',
                                        { total: mold.totalLifeCycles || 0 }
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </TabsContent>

                              <TabsContent value='maintenance' className='mt-0'>
                                <MaintenanceRecordList
                                  assetType='MOLD'
                                  assetId={mold.id}
                                  assetSn={mold.sn}
                                />
                              </TabsContent>
                            </Tabs>
                          </CardContent>
                        </Card>
                      )
                    })}

                    <Button
                      variant='ghost'
                      className='group flex h-full min-h-[260px] flex-col gap-3 rounded-[24px] border-2 border-dashed border-muted/50 py-12 text-muted-foreground/40 transition-all hover:border-primary/50 hover:bg-primary/[0.02]'
                      onClick={() => {
                        setEditingMold(
                          createMoldDraft({
                            sn: `MOLD-${Date.now().toString().slice(-6)}`,
                            groupName:
                              group ===
                              t('equipmentTooling.molds.defaults.uncategorized')
                                ? ''
                                : group,
                          })
                        )
                        setIsDialogOpen(true)
                      }}
                    >
                      <div className='flex size-12 items-center justify-center rounded-full border border-transparent bg-muted/50 transition-all duration-300 group-hover:scale-110 group-hover:border-primary/20 group-hover:bg-primary/10'>
                        <Plus className='size-6 transition-colors group-hover:text-primary' />
                      </div>
                      <span className='text-[10px] font-black tracking-widest uppercase'>
                        {t('equipmentTooling.molds.actions.addInGroup')}
                      </span>
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>

        {groupNames.length === 0 && (
          <div className='flex flex-col items-center justify-center rounded-[32px] border border-dashed bg-muted/5 px-6 py-20 text-center'>
            <Box className='mb-6 size-14 text-muted-foreground/10' />
            <h3 className='text-sm font-black tracking-widest text-foreground/40 uppercase'>
              {t('equipmentTooling.molds.empty.title')}
            </h3>
            <p className='mt-2 max-w-[240px] text-[10px] font-bold text-muted-foreground/30 uppercase'>
              {t('equipmentTooling.molds.empty.description')}
            </p>
            <Button
              className='xs:w-auto mt-8 h-12 w-full rounded-full bg-primary px-10 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-primary/20'
              onClick={handleAddMold}
            >
              {t('equipmentTooling.molds.empty.init')}
            </Button>
          </div>
        )}
      </div>

      <MoldActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConfirm={handleConfirm}
        editData={editingMold}
      />
    </div>
  )
}
