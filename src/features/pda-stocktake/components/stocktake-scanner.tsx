'use client'

import { useState, useRef, useEffect } from 'react'
import { Scan, Package, Box, RefreshCw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { DeltaSet } from '@/lib/delta/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { StocktakeItem } from '../data/schema'
import {
  useGetStocktakeItems,
  useStocktakeMutations,
} from '../hooks/use-stocktake'

interface StocktakeScannerProps {
  taskId: string
  onBack: () => void
}

export function StocktakeScanner({ taskId, onBack }: StocktakeScannerProps) {
  const { data: items = [], isLoading } = useGetStocktakeItems(taskId)
  const {
    patchItemMutation,
    flushPatchMutation,
    resolveConflictMutation,
    retryConflictMutation,
    batchResolveConflictMutation,
    batchRetryConflictMutation,
    conflicts,
    resolvedConflicts,
  } = useStocktakeMutations()

  const [scannedCode, setScannedCode] = useState('')
  const [selectedItem, setSelectedItem] = useState<StocktakeItem | null>(null)
  const scanInputRef = useRef<HTMLInputElement>(null)
  const taskConflicts = conflicts.filter((item) => item.taskId === taskId)
  const taskResolvedConflicts = resolvedConflicts.filter(
    (item) => item.taskId === taskId
  )

  // 处理扫码逻辑
  const handleScan = (code: string) => {
    const item = items.find(
      (i) => i.materialCode === code || i.batchNo === code
    )
    if (item) {
      setSelectedItem(item)
      setScannedCode('')
    } else {
      setScannedCode('')
      // PDA 特色反馈：视觉 + Toast
      toast.error(`[SCANN_ERR] 未在盘点单中找到条码: ${code}`, {
        description: '请检查物料是否属于当前库区或批次。',
      })
    }
  }

  // 聚焦扫码框
  useEffect(() => {
    scanInputRef.current?.focus()
  }, [])

  return (
    <div className='flex h-screen flex-col gap-6 bg-background p-4'>
      {/* PDA 扫码顶栏 */}
      <div className='flex items-center justify-between'>
        <Button
          variant='ghost'
          onClick={onBack}
          className='h-10 rounded-full px-4 font-black'
        >
          ← BACK
        </Button>
        <div className='flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5'>
          <span className='text-[10px] font-black tracking-widest text-blue-600 uppercase'>
            SDRTS_ACTIVE
          </span>
          <div className='size-2 animate-pulse rounded-full bg-blue-500' />
        </div>
      </div>

      {/* 虚拟扫码输入 (隐藏但始终对准) */}
      <div className='group relative'>
        <Scan className='absolute top-1/2 left-4 size-5 -translate-y-1/2 animate-pulse text-muted-foreground/30' />
        <Input
          ref={scanInputRef}
          value={scannedCode}
          onChange={(e) => setScannedCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleScan(scannedCode)}
          placeholder='START_SCANNING / 扫描物料或批次'
          className='h-14 rounded-2xl border-none bg-muted/40 pl-12 text-sm font-black tracking-widest uppercase shadow-inner'
        />
      </div>

      {taskConflicts.length > 0 ? (
        <Card className='rounded-3xl border border-amber-500/20 bg-amber-500/5 shadow-none'>
          <CardContent className='space-y-3 p-4'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-2'>
                <AlertTriangle className='size-4 text-amber-600' />
                <div>
                  <p className='text-[11px] font-black tracking-widest text-amber-700 uppercase'>
                    CONFLICT_QUEUE
                  </p>
                  <p className='text-[11px] text-muted-foreground'>
                    当前有 {taskConflicts.length} 条盘点冲突待处理
                  </p>
                </div>
              </div>
              <Button
                variant='outline'
                className='h-9 rounded-2xl text-[10px] font-black tracking-widest uppercase'
                onClick={() => flushPatchMutation.mutate()}
                disabled={flushPatchMutation.isPending}
              >
                重新 flush
              </Button>
            </div>

            <div className='space-y-2'>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='secondary'
                  className='h-8 rounded-xl text-[10px] font-black tracking-widest uppercase'
                  onClick={() =>
                    batchRetryConflictMutation.mutate({
                      conflictIds: taskConflicts.map((item) => item.conflictId),
                      taskId,
                    })
                  }
                  disabled={
                    taskConflicts.length === 0 ||
                    batchRetryConflictMutation.isPending
                  }
                >
                  批量刷新后重试
                </Button>
                <Button
                  variant='secondary'
                  className='h-8 rounded-xl text-[10px] font-black tracking-widest uppercase'
                  onClick={() =>
                    batchResolveConflictMutation.mutate(
                      taskConflicts.map((item) => item.conflictId)
                    )
                  }
                  disabled={
                    taskConflicts.length === 0 ||
                    batchResolveConflictMutation.isPending
                  }
                >
                  批量清除冲突
                </Button>
              </div>

              {taskConflicts.map((conflict) => (
                <div
                  key={conflict.conflictId}
                  className='rounded-2xl border border-amber-500/15 bg-background/70 p-3'
                >
                  <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
                    <div>
                      <p className='text-[11px] font-black tracking-wider text-foreground uppercase'>
                        ITEM {conflict.itemId}
                      </p>
                      <p className='text-[11px] text-muted-foreground'>
                        路径: {conflict.path} / 版本: {conflict.version}
                      </p>
                      <p className='text-[11px] text-amber-700'>
                        {conflict.errorMessage ??
                          '检测到版本冲突，请刷新最新盘点项后决定是否重试。'}
                      </p>
                      <div className='mt-2 rounded-xl border border-amber-500/10 bg-amber-500/5 p-2'>
                        <p className='text-[10px] font-black tracking-widest text-amber-700 uppercase'>
                          MERGE_SUGGESTION
                        </p>
                        <p className='text-[11px] text-muted-foreground'>
                          {conflict.mergeSuggestion.label} -{' '}
                          {conflict.mergeSuggestion.reason}
                        </p>
                      </div>
                      <div className='mt-2 space-y-1'>
                        {conflict.fieldDiffs.map((field) => (
                          <div
                            key={`${conflict.conflictId}-${field.path}`}
                            className='rounded-xl border border-border/60 bg-background p-2'
                          >
                            <p className='text-[10px] font-black tracking-widest text-foreground uppercase'>
                              {field.path}
                            </p>
                            <p className='text-[11px] text-muted-foreground'>
                              旧值: {String(field.oldValue ?? '∅')}
                            </p>
                            <p className='text-[11px] text-foreground'>
                              新值: {String(field.newValue ?? '∅')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        variant='outline'
                        className='h-8 rounded-xl text-[10px] font-black tracking-widest uppercase'
                        onClick={() =>
                          retryConflictMutation.mutate({
                            conflictId: conflict.conflictId,
                            taskId,
                          })
                        }
                        disabled={retryConflictMutation.isPending}
                      >
                        刷新后重试
                      </Button>
                      <Button
                        variant='ghost'
                        className='h-8 rounded-xl text-[10px] font-black tracking-widest uppercase'
                        onClick={() =>
                          resolveConflictMutation.mutate(conflict.conflictId)
                        }
                        disabled={resolveConflictMutation.isPending}
                      >
                        清除冲突
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {taskResolvedConflicts.length > 0 ? (
        <Card className='rounded-3xl border border-emerald-500/20 bg-emerald-500/5 shadow-none'>
          <CardContent className='space-y-3 p-4'>
            <div className='flex items-center gap-2'>
              <RefreshCw className='size-4 text-emerald-600' />
              <div>
                <p className='text-[11px] font-black tracking-widest text-emerald-700 uppercase'>
                  RESOLVED_HISTORY
                </p>
                <p className='text-[11px] text-muted-foreground'>
                  当前任务已有 {taskResolvedConflicts.length} 条已处理冲突记录
                </p>
              </div>
            </div>

            <div className='space-y-2'>
              {taskResolvedConflicts.map((conflict) => (
                <div
                  key={conflict.conflictId}
                  className='rounded-2xl border border-emerald-500/15 bg-background/70 p-3'
                >
                  <p className='text-[11px] font-black tracking-wider text-foreground uppercase'>
                    ITEM {conflict.itemId}
                  </p>
                  <p className='text-[11px] text-muted-foreground'>
                    路径: {conflict.path} / 版本: {conflict.version}
                  </p>
                  <p className='text-[11px] text-emerald-700'>
                    处理方式:{' '}
                    {conflict.resolvedStrategy === 'retry'
                      ? '刷新后重试'
                      : '清除冲突'}{' '}
                    / 处理时间: {conflict.resolvedAt ?? '-'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 扫码结果区 */}
      {isLoading ? (
        <div className='flex flex-1 flex-col items-center justify-center opacity-20'>
          <RefreshCw className='mb-4 size-8 animate-spin' />
          <p className='text-[10px] font-black tracking-[0.5em] uppercase'>
            Syncing_Stocktake_Index
          </p>
        </div>
      ) : selectedItem ? (
        <ScannerItemDetail
          item={selectedItem}
          onSave={(delta, version) => {
            patchItemMutation.mutate({
              id: selectedItem.id,
              delta,
              version: version, // 明确使用传递的 version
              taskId,
            })
            setSelectedItem(null)
            scanInputRef.current?.focus()
          }}
          onCancel={() => {
            setSelectedItem(null)
            scanInputRef.current?.focus()
          }}
        />
      ) : (
        <div className='flex flex-1 flex-col items-center justify-center text-muted-foreground/20 italic'>
          <Scan className='mb-6 size-24 opacity-5' />
          <p className='text-xs font-black tracking-widest uppercase'>
            Ready_For_Session
          </p>
          <p className='mt-2 text-[9px]'>SCAN_MATERIAL_OR_BATCH_NOW</p>
        </div>
      )}
    </div>
  )
}

function ScannerItemDetail({
  item,
  onSave,
  onCancel,
}: {
  item: StocktakeItem
  onSave: (delta: DeltaSet, version: number) => void
  onCancel: () => void
}) {
  const [actualQty, setActualQty] = useState(item.actualQty)
  const isDirty = actualQty !== item.actualQty
  const isDiff = actualQty !== item.theoryQty

  return (
    <Card className='flex animate-in flex-col overflow-hidden rounded-[32px] border-none bg-muted/5 shadow-2xl duration-300 zoom-in-95'>
      <CardContent className='space-y-8 p-8'>
        {/* 物料核心档案 */}
        <div className='space-y-4'>
          <div className='flex items-center gap-3'>
            <div className='rounded-2xl bg-blue-600 p-3 shadow-lg shadow-blue-600/20'>
              <Package className='size-6 text-white' />
            </div>
            <div className='flex flex-col'>
              <h2 className='text-xl leading-none font-black tracking-tighter italic'>
                {item.materialName}
              </h2>
              <span className='mt-1 font-mono text-[10px] font-black tracking-widest text-muted-foreground opacity-60'>
                {item.materialCode} / {item.batchNo}
              </span>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='rounded-2xl border border-dashed border-muted-foreground/10 bg-background p-4'>
              <Label className='mb-1 block text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
                账面数 / THEORY
              </Label>
              <div className='flex items-center gap-2'>
                <Box className='size-3 text-muted-foreground/40' />
                <span className='font-mono text-lg font-black italic'>
                  {item.theoryQty}{' '}
                  <small className='text-[10px]'>{item.uom}</small>
                </span>
              </div>
            </div>
            <div
              className={cn(
                'flex flex-col justify-center rounded-2xl border border-dashed p-4',
                isDiff
                  ? 'border-amber-500/20 bg-amber-500/5'
                  : 'border-emerald-500/20 bg-emerald-500/5'
              )}
            >
              <Label
                className={cn(
                  'mb-1 block text-[9px] font-black tracking-widest uppercase',
                  isDiff ? 'text-amber-600' : 'text-emerald-600'
                )}
              >
                状态 / STAT
              </Label>
              <span
                className={cn(
                  'text-[10px] font-black uppercase italic',
                  isDiff ? 'text-amber-600' : 'text-emerald-600'
                )}
              >
                {isDiff ? `DIFF: ${actualQty - item.theoryQty}` : 'MATCHED'}
              </span>
            </div>
          </div>
        </div>

        {/* 盘点输入 - PDA 风格大数字 */}
        <div className='space-y-4 pt-4'>
          <Label className='text-[10px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase'>
            输入实盘数量 / ACTUAL_COUNT
          </Label>
          <div className='flex items-center gap-4'>
            <Button
              variant='outline'
              className='size-14 rounded-2xl border-dashed text-xl font-black transition-all active:scale-90'
              onClick={() => {
                setActualQty((current) => Math.max(0, current - 1))
              }}
            >
              -
            </Button>
            <Input
              type='number'
              className='h-14 rounded-2xl border-none bg-background text-center font-mono text-2xl font-black shadow-inner focus-visible:ring-blue-500/20'
              value={actualQty}
              onChange={(e) => {
                setActualQty(parseFloat(e.target.value) || 0)
              }}
            />
            <Button
              variant='outline'
              className='size-14 rounded-2xl border-dashed text-xl font-black transition-all active:scale-90'
              onClick={() => {
                setActualQty((current) => current + 1)
              }}
            >
              +
            </Button>
          </div>
        </div>

        {/* 底部操作 */}
        <div className='grid grid-cols-2 gap-4 pt-4'>
          <Button
            variant='ghost'
            onClick={onCancel}
            className='h-12 rounded-2xl text-[10px] font-black tracking-widest uppercase'
          >
            丢弃 / DISCARD
          </Button>
          <Button
            onClick={() => {
              // Fail Loudly: 断言核心数据存在
              if (!item.id || item.version === undefined) {
                throw new Error(
                  `[CRITICAL] StocktakeItem ID or Version missing for ${item.materialCode}`
                )
              }

              if (!isDirty) {
                toast.info('数据未发生变更，已忽略同步')
                onCancel()
                return
              }

              onSave(
                {
                  actualQty: {
                    o: item.actualQty,
                    n: actualQty,
                  },
                  difference: {
                    o: item.difference,
                    n: actualQty - item.theoryQty,
                  },
                },
                item.version
              )
            }}
            className='h-12 rounded-2xl bg-blue-600 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-blue-600/30 transition-all active:scale-95'
          >
            确认存入 / COMMIT_DELTA
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
