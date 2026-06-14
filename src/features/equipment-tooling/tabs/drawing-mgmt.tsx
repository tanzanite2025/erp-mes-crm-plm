'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FilePlus,
  Search,
  FileText,
  Download,
  Trash2,
  Edit2,
  FileIcon,
  Tag,
  RotateCcw,
  History,
  User,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { buildFlattenDelta } from '@/lib/delta/flatten-delta'
import { type DeltaSet } from '@/lib/delta/types'
import { isForbiddenError } from '@/lib/error-status'
import { isConflictError } from '@/lib/handle-server-error'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ForbiddenState } from '@/components/forbidden-state'
import { DrawingActionDialog } from '../components/drawing-action-dialog'
import { type MoldDrawing, type MoldDrawingLog } from '../data/schema'
import { MOLDS_QUERY_KEY } from '../hooks/use-assets'
import { DrawingService } from '../services/drawing-service'
import { MoldCoreService } from '../services/mold-core-service'

const MOLD_DRAWINGS_QUERY_KEY = ['equipment-tooling', 'drawings'] as const

export function DrawingMgmt() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { runConfirmedAction } = useConfirmedActionFlow()
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLogOpen, setIsLogOpen] = useState(false)
  const [currentLogs, setCurrentLogs] = useState<MoldDrawingLog[]>([])
  const [selectedDrawing, setSelectedDrawing] = useState<MoldDrawing | null>(
    null
  )
  const [editingDrawing, setEditingDrawing] = useState<MoldDrawing | null>(null)
  const { data: drawings = [], error: drawingsError } = useQuery({
    queryKey: MOLD_DRAWINGS_QUERY_KEY,
    queryFn: () => DrawingService.getDrawings(),
  })
  const { data: molds = [], error: moldsError } = useQuery({
    queryKey: MOLDS_QUERY_KEY,
    queryFn: () => MoldCoreService.getMolds(),
  })
  const error = drawingsError ?? moldsError

  const filteredDrawings = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) {
      return drawings
    }

    return drawings.filter((drawing) =>
      [drawing.name, drawing.moldSn ?? ''].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    )
  }, [drawings, searchTerm])

  const openCreateDialog = () => {
    void runConfirmedAction({
      permission: 'action_equipment_drawing_manage',
      onAction: () => {
        setEditingDrawing(null)
        setIsDialogOpen(true)
      },
    })
  }

  const openEditDialog = (drawing: MoldDrawing) => {
    void runConfirmedAction({
      permission: 'action_equipment_drawing_update',
      onAction: () => {
        setEditingDrawing(drawing)
        setIsDialogOpen(true)
      },
    })
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
      delta,
    }: {
      data: MoldDrawing
      isPatch?: boolean
      delta?: DeltaSet
    }) => {
      if (isPatch && delta && editingDrawing) {
        return DrawingService.patchDrawing(
          editingDrawing.id,
          delta,
          editingDrawing.sysVersion
        )
      }
      return DrawingService.addDrawing(data)
    },
    onSuccess: async () => {
      toast.success(
        editingDrawing
          ? t('equipmentTooling.drawings.toast.updated')
          : t('equipmentTooling.drawings.toast.created')
      )
      setIsDialogOpen(false)
      setEditingDrawing(null)
      await queryClient.invalidateQueries({ queryKey: MOLD_DRAWINGS_QUERY_KEY })
    },
    onError: (error: unknown) => {
      if (isConflictError(error)) {
        toast.error(t('equipmentTooling.drawings.toast.conflict'))
        return
      }
      const message =
        error instanceof Error
          ? error.message
          : t('equipmentTooling.common.unknownError')
      toast.error(t('equipmentTooling.drawings.toast.saveFailed', { message }))
    },
  })

  const handleSave = async (
    data: MoldDrawing,
    isPatch?: boolean,
    delta?: DeltaSet
  ) => {
    mutation.mutate({ data, isPatch, delta })
  }

  const handleDownload = (drawing: MoldDrawing) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
    const fullUrl = drawing.fileUrl.startsWith('http')
      ? drawing.fileUrl
      : `${baseUrl}${drawing.fileUrl}`

    const link = document.createElement('a')
    link.href = fullUrl
    link.download = drawing.name
    link.target = '_blank'
    link.click()
  }

  const handleToggleStatus = (drawing: MoldDrawing) => {
    void runConfirmedAction({
      permission: 'action_equipment_drawing_update',
      confirmKey:
        drawing.status === 'ACTIVE'
          ? 'equipmentTooling.drawings.tooltips.obsolete'
          : 'equipmentTooling.drawings.tooltips.activate',
      onAction: async () => {
        const nextStatus: MoldDrawing['status'] =
          drawing.status === 'ACTIVE' ? 'OBSOLETE' : 'ACTIVE'
        const delta = buildFlattenDelta(drawing.status ?? 'DRAFT', nextStatus, {
          basePath: 'status',
        })
        await DrawingService.patchDrawing(
          drawing.id,
          delta,
          drawing.sysVersion || 1
        )
        toast.success(
          nextStatus === 'ACTIVE'
            ? t('equipmentTooling.drawings.toast.statusActive')
            : t('equipmentTooling.drawings.toast.statusObsolete')
        )
        await queryClient.invalidateQueries({
          queryKey: MOLD_DRAWINGS_QUERY_KEY,
        })
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
          <FileText className='size-4' />
          <h3 className='text-base font-black tracking-tighter uppercase italic sm:text-lg'>
            {t('equipmentTooling.drawings.page.title')}
          </h3>
        </div>
        <p className='text-[8px] font-black tracking-widest text-muted-foreground uppercase opacity-60 sm:text-[9px]'>
          {t('equipmentTooling.drawings.page.description')}
        </p>
      </div>

      <div className='flex flex-col items-stretch justify-between gap-4 rounded-[24px] border border-dashed bg-muted/5 p-4 sm:p-5 md:flex-row md:items-center'>
        <div className='group relative w-full md:w-[400px]'>
          <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary' />
          <Input
            placeholder={t('equipmentTooling.drawings.page.searchPlaceholder')}
            className='h-12 w-full rounded-2xl border-none bg-muted/50 pl-11 text-xs font-bold shadow-inner'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <Button
          className='h-12 w-full shrink-0 gap-2 rounded-full bg-blue-600 px-8 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 md:w-auto'
          onClick={openCreateDialog}
        >
          <FilePlus className='size-4' />
          {t('equipmentTooling.drawings.actions.add')}
        </Button>
      </div>
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {filteredDrawings.map((drawing) => (
          <Card
            key={drawing.id}
            className='group relative overflow-hidden rounded-[24px] border-dashed border-slate-200 bg-muted/5 transition-all duration-500 hover:shadow-2xl'
          >
            <div className='absolute top-4 right-4 z-10 flex gap-2 rounded-2xl border border-dashed bg-white/80 p-1.5 opacity-100 shadow-sm backdrop-blur-md transition-all duration-300 md:opacity-0 md:group-hover:opacity-100'>
              <Button
                variant='ghost'
                size='icon'
                className='size-8 rounded-xl text-blue-600 hover:bg-blue-50'
                title={t('equipmentTooling.drawings.tooltips.history')}
                onClick={() => handleViewLogs(drawing)}
              >
                <History className='size-4' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='size-8 rounded-xl hover:bg-slate-100'
                onClick={() => openEditDialog(drawing)}
              >
                <Edit2 className='size-4' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='size-8 rounded-xl text-rose-500 hover:bg-rose-50'
                title={
                  drawing.status === 'ACTIVE'
                    ? t('equipmentTooling.drawings.tooltips.obsolete')
                    : t('equipmentTooling.drawings.tooltips.activate')
                }
                onClick={() => handleToggleStatus(drawing)}
              >
                {drawing.status === 'ACTIVE' ? (
                  <Trash2 className='size-4' />
                ) : (
                  <RotateCcw className='size-4 text-emerald-500' />
                )}
              </Button>
            </div>

            <CardContent className='space-y-6 p-5 sm:p-6'>
              <div className='flex items-center gap-4'>
                <div className='flex size-14 shrink-0 items-center justify-center rounded-[24px] border border-dashed border-primary/20 bg-primary/5 text-primary sm:size-16'>
                  {drawing.type === '3D' ? (
                    <FileIcon className='size-7 text-purple-500 sm:size-8' />
                  ) : (
                    <FileText className='size-7 text-blue-500 sm:size-8' />
                  )}
                </div>
                <div className='min-w-0 flex-1'>
                  <h4
                    className={`truncate text-base font-black tracking-tighter sm:text-lg ${drawing.status === 'OBSOLETE' ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                  >
                    {drawing.name}
                  </h4>
                  <div className='mt-1 flex items-center gap-2'>
                    <Badge
                      variant='outline'
                      className='h-4 rounded-full border-none bg-slate-500/10 text-[7px] font-black tracking-widest text-slate-600 uppercase'
                    >
                      {t(
                        `equipmentTooling.drawings.types.${drawing.type === '2D' ? 'twoD' : drawing.type === '3D' ? 'threeD' : drawing.type === 'TECH_SPEC' ? 'techSpec' : 'other'}`
                      )}
                    </Badge>
                    <span className='font-mono text-[8px] font-black text-muted-foreground/40 uppercase'>
                      {drawing.version}
                    </span>
                    {drawing.status === 'ACTIVE' && (
                      <Badge
                        variant='outline'
                        className='h-4 rounded-full border-none bg-emerald-500/10 text-[7px] font-black tracking-widest text-emerald-600 uppercase'
                      >
                        {t('equipmentTooling.drawings.status.active')}
                      </Badge>
                    )}
                    {drawing.status === 'OBSOLETE' && (
                      <Badge
                        variant='outline'
                        className='h-4 rounded-full border-none bg-rose-500/10 text-[7px] font-black tracking-widest text-rose-600 uppercase'
                      >
                        {t('equipmentTooling.drawings.status.obsolete')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-2.5'>
                  <span className='flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                    <Tag className='size-3' />{' '}
                    {t('equipmentTooling.drawings.card.asset')}
                  </span>
                  <span className='font-mono text-[10px] font-black text-blue-600'>
                    {drawing.moldSn ||
                      t('equipmentTooling.drawings.card.unbound')}
                  </span>
                </div>
                <div className='flex items-center justify-between px-2 text-[8px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                  <span className='flex items-center gap-1'>
                    <Clock className='size-2.5' />{' '}
                    {t('equipmentTooling.drawings.card.date')}
                  </span>
                  <span className='font-mono italic'>
                    {new Date(drawing.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <Button
                variant='outline'
                className='h-11 w-full gap-3 rounded-full border-dashed border-slate-200 text-[10px] font-black tracking-widest uppercase shadow-sm transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white active:scale-95'
                onClick={() => handleDownload(drawing)}
              >
                <Download className='size-4' />
                {t('equipmentTooling.drawings.actions.download')}
              </Button>
            </CardContent>
          </Card>
        ))}

        {filteredDrawings.length === 0 && (
          <div className='col-span-full flex flex-col items-center justify-center rounded-[32px] border border-dashed bg-muted/5 py-20'>
            <FileIcon className='mb-4 size-12 text-muted-foreground/20' />
            <p className='text-sm font-black tracking-tighter text-muted-foreground/40 uppercase'>
              {t('equipmentTooling.drawings.empty.title')}
            </p>
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
        <DialogContent className='flex max-h-[92vh] w-[95vw] flex-col overflow-hidden rounded-[32px] border-none p-0 shadow-2xl sm:max-w-[600px]'>
          <DialogHeader className='shrink-0 border-b border-dashed border-blue-100 bg-blue-600/5 p-6 pb-4 sm:p-8'>
            <DialogTitle className='flex items-center gap-3 text-xl font-black tracking-tighter'>
              <History className='size-6 text-blue-600' />
              {t('equipmentTooling.drawings.audit.title')}
            </DialogTitle>
            <DialogDescription className='mt-1 text-[9px] font-black tracking-widest uppercase opacity-60'>
              {t('equipmentTooling.drawings.audit.description', {
                fileId:
                  selectedDrawing?.id?.slice(-8).toUpperCase() || '--------',
                asset:
                  selectedDrawing?.moldSn ||
                  t('equipmentTooling.drawings.audit.global'),
              })}
            </DialogDescription>
          </DialogHeader>

          <div className='custom-scrollbar relative flex-1 overflow-y-auto px-6 py-8 sm:px-10'>
            <div className='absolute top-8 bottom-8 left-[24px] w-px border-l-2 border-dashed border-slate-100 sm:left-[40px]' />
            <div className='space-y-8'>
              {currentLogs.length === 0 ? (
                <div className='py-16 text-center opacity-30'>
                  <p className='text-[10px] font-black tracking-widest uppercase'>
                    {t('equipmentTooling.drawings.audit.empty')}
                  </p>
                </div>
              ) : (
                currentLogs.map((log) => (
                  <div key={log.id} className='relative pl-10'>
                    <div
                      className={cn(
                        'absolute top-1 left-[-21px] z-10 size-4 rounded-full border-2 border-white shadow-sm sm:left-[-5px]',
                        log.action === 'CREATED'
                          ? 'bg-emerald-500'
                          : log.action === 'BIND'
                            ? 'bg-blue-600'
                            : log.action === 'VERSION_UPDATE'
                              ? 'bg-purple-600'
                              : log.action === 'STATUS_CHANGE'
                                ? 'bg-rose-500'
                                : 'bg-slate-400'
                      )}
                    />

                    <div className='rounded-2xl border border-dashed border-muted-foreground/10 bg-muted/5 p-4 transition-all hover:bg-white'>
                      <div className='mb-2 flex items-center justify-between'>
                        <span className='text-[9px] font-black tracking-widest text-primary/40 uppercase'>
                          {log.action}
                        </span>
                        <span className='font-mono text-[8px] font-bold text-muted-foreground/30 italic'>
                          {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className='mb-3 text-sm leading-snug font-black tracking-tight text-slate-700'>
                        {log.details}
                      </p>

                      {/* SDRTS: 结构化差量可视化 (演进时间线) */}
                      {log.delta && Object.keys(log.delta).length > 0 && (
                        <div className='mb-3 space-y-2 rounded-xl border border-dashed border-slate-200 bg-white/50 p-3'>
                          <div className='border-b border-dashed border-slate-100 pb-1 text-[8px] font-black tracking-widest text-slate-400 uppercase'>
                            Technical Changes (SDRTS)
                          </div>
                          <div className='space-y-1.5'>
                            {Object.entries(log.delta as DeltaSet).map(
                              ([field, values]) => (
                                <div
                                  key={field}
                                  className='flex min-w-0 items-center gap-2 text-[9px]'
                                >
                                  <span className='rounded bg-slate-100 px-1.5 py-0.5 font-black whitespace-nowrap text-slate-500 italic'>
                                    {field}
                                  </span>
                                  <div className='flex min-w-0 flex-1 items-center gap-1.5 font-mono'>
                                    <span className='max-w-[100px] truncate text-rose-400/60 line-through'>
                                      {String(values.o ?? 'NULL')}
                                    </span>
                                    <span className='text-slate-300'>→</span>
                                    <span className='max-w-[150px] truncate font-bold text-emerald-600'>
                                      {String(values.n ?? 'NULL')}
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      <div className='flex items-center justify-between border-t border-dashed border-muted-foreground/5 pt-2'>
                        <div className='flex items-center gap-1.5 text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                          <User className='size-3' />{' '}
                          {t('equipmentTooling.drawings.audit.operator')}:{' '}
                          {log.operator}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className='shrink-0 border-t border-dashed border-muted-foreground/10 bg-muted/5 p-6 sm:p-8'>
            <Button
              variant='ghost'
              className='h-11 w-full rounded-full text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'
              onClick={() => setIsLogOpen(false)}
            >
              {t('equipmentTooling.drawings.audit.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
