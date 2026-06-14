'use client'

import { useMemo } from 'react'
import { Clock, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBOMVersionTrace } from '../hooks/use-bom-version-trace'

interface BOMVersionTraceContentProps {
  bomId?: string
  productId?: string
  createdFrom?: string
  createdTo?: string
  open: boolean
  className?: string
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }
  if (typeof value === 'string') {
    return value.trim() || '—'
  }
  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map((item) => renderValue(item)).join(' / ')
      : '—'
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '—'
    }
  }
  return String(value)
}

function resolveScopeLabel(params: { bomId?: string; productId?: string }) {
  if (params.bomId?.trim()) {
    return '指定 BOM'
  }
  if (params.productId?.trim()) {
    return '当前产品'
  }
  return '全部 BOM'
}

function resolveDateRangeLabel(params: {
  createdFrom?: string
  createdTo?: string
}) {
  const createdFrom = params.createdFrom?.trim() || ''
  const createdTo = params.createdTo?.trim() || ''
  if (createdFrom && createdTo) {
    return `${createdFrom} ~ ${createdTo}`
  }
  if (createdFrom) {
    return `${createdFrom} 起`
  }
  if (createdTo) {
    return `${createdTo} 止`
  }
  return ''
}

function FieldChangeCard({
  label,
  beforeValue,
  afterValue,
}: {
  label: string
  beforeValue: unknown
  afterValue: unknown
}) {
  return (
    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
      <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
        {label}
      </div>
      <div className='mt-3 grid gap-3 xl:grid-cols-2'>
        <div className='rounded-2xl border border-dashed border-rose-500/20 bg-rose-500/5 p-3'>
          <div className='text-[8px] font-black tracking-widest text-rose-700/60 uppercase'>
            左侧版本
          </div>
          <div className='mt-1 font-mono text-[11px] break-all text-rose-700'>
            {renderValue(beforeValue)}
          </div>
        </div>
        <div className='rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/5 p-3'>
          <div className='text-[8px] font-black tracking-widest text-emerald-700/60 uppercase'>
            右侧版本
          </div>
          <div className='mt-1 font-mono text-[11px] break-all text-emerald-700'>
            {renderValue(afterValue)}
          </div>
        </div>
      </div>
    </div>
  )
}

export function BOMVersionTraceContent({
  bomId,
  productId,
  createdFrom,
  createdTo,
  open,
  className,
}: BOMVersionTraceContentProps) {
  const trace = useBOMVersionTrace({
    bomId,
    productId,
    createdFrom,
    createdTo,
    open,
  })

  const activeGroup = useMemo(
    () =>
      trace.groups.find((group) => group.bomId === trace.activeBomId) || null,
    [trace.activeBomId, trace.groups]
  )

  const scopeLabel = useMemo(
    () => resolveScopeLabel({ bomId, productId }),
    [bomId, productId]
  )
  const dateRangeLabel = useMemo(
    () => resolveDateRangeLabel({ createdFrom, createdTo }),
    [createdFrom, createdTo]
  )

  return (
    <div className={cn('grid min-h-0 grid-rows-[auto_1fr]', className)}>
      <div className='flex flex-wrap items-center gap-2 border-b border-dashed bg-background/80 px-5 py-3'>
        <Badge
          variant='outline'
          className='h-5 rounded-full border-dashed bg-background font-mono text-[8px]'
        >
          范围 · {scopeLabel}
        </Badge>
        {dateRangeLabel ? (
          <Badge
            variant='outline'
            className='h-5 rounded-full border-dashed bg-background font-mono text-[8px]'
          >
            时间 · {dateRangeLabel}
          </Badge>
        ) : null}
        {activeGroup ? (
          <Badge
            variant='outline'
            className='h-5 rounded-full border-dashed bg-background font-mono text-[8px]'
          >
            当前分组 · {activeGroup.bomNo}
          </Badge>
        ) : null}
        <Badge
          variant='outline'
          className='h-5 rounded-full border-dashed bg-background font-mono text-[8px]'
        >
          BOM 数量 · {trace.groups.length}
        </Badge>
        {trace.hasAnyRecord ? (
          <Badge
            variant='outline'
            className='h-5 rounded-full border-dashed bg-background font-mono text-[8px]'
          >
            当前记录 · {trace.activeRecords.length}
          </Badge>
        ) : null}
      </div>

      <div className='grid min-h-0 lg:grid-cols-[320px_1fr]'>
        <div className='flex min-h-0 flex-col border-b border-dashed bg-muted/5 lg:border-r lg:border-b-0'>
          <div className='border-b border-dashed px-4 py-4'>
            <div className='text-sm font-black tracking-tighter italic'>
              追溯记录
            </div>
            <div className='mt-1 text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              优先按最新版本排序
            </div>
          </div>

          {trace.groups.length > 1 ? (
            <div className='border-b border-dashed px-4 py-3'>
              <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                BOM 分组
              </div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {trace.groups.map((group) => (
                  <Button
                    key={group.bomId}
                    type='button'
                    variant='outline'
                    onClick={() => trace.setSelectedBomId(group.bomId)}
                    className={cn(
                      'h-8 rounded-full border-dashed px-3 text-[10px] font-black tracking-widest uppercase',
                      trace.activeBomId === group.bomId
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'bg-background'
                    )}
                  >
                    {group.bomNo}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <ScrollArea className='min-h-0 flex-1'>
            <div className='flex flex-col gap-3 p-4'>
              {trace.isLoadingHistory ? (
                <div className='rounded-[24px] border border-dashed bg-background p-4 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  正在读取版本记录...
                </div>
              ) : trace.error ? (
                <div className='rounded-[24px] border border-dashed border-rose-300 bg-rose-50/60 p-4 text-[10px] font-black tracking-widest text-rose-700 uppercase'>
                  版本记录读取失败
                </div>
              ) : trace.activeRecords.length === 0 ? (
                <div className='rounded-[24px] border border-dashed bg-background p-4 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  暂无版本记录
                </div>
              ) : (
                trace.activeRecords.map((record) => {
                  const isLeft = trace.leftVersionId === record.id
                  const isRight = trace.rightVersionId === record.id
                  return (
                    <div
                      key={record.id}
                      className='rounded-[24px] border border-dashed bg-background p-4'
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div className='space-y-2'>
                          <div className='flex items-center gap-2'>
                            <Badge
                              variant='outline'
                              className='h-5 rounded-full border-dashed bg-background font-mono text-[8px]'
                            >
                              #{record.versionSequence}
                            </Badge>
                            <Badge
                              variant='outline'
                              className='h-5 rounded-full border-dashed bg-blue-50 font-mono text-[8px] text-blue-700'
                            >
                              {record.displayVersionLabel}
                            </Badge>
                            <Badge
                              variant='outline'
                              className='h-5 rounded-full border-dashed bg-background font-mono text-[8px]'
                            >
                              {record.operation}
                            </Badge>
                          </div>
                          <div className='text-sm font-black tracking-tight text-slate-800'>
                            {record.bomNo}
                          </div>
                          <div className='flex items-center gap-1.5 font-mono text-[8px] text-muted-foreground'>
                            <Clock className='size-3' />
                            <span>{record.createdAt || '—'}</span>
                          </div>
                          <div className='font-mono text-[8px] text-muted-foreground'>
                            操作人 · {record.createdBy || 'system'}
                          </div>
                        </div>
                        <div className='flex flex-col gap-2'>
                          <Button
                            type='button'
                            variant={isLeft ? 'default' : 'outline'}
                            onClick={() => trace.setLeftVersionId(record.id)}
                            className='h-8 rounded-full border-dashed px-3 text-[10px] font-black tracking-widest uppercase'
                          >
                            左侧
                          </Button>
                          <Button
                            type='button'
                            variant={isRight ? 'default' : 'outline'}
                            onClick={() => trace.setRightVersionId(record.id)}
                            className='h-8 rounded-full border-dashed px-3 text-[10px] font-black tracking-widest uppercase'
                          >
                            右侧
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <div className='flex min-h-0 flex-col overflow-hidden'>
          <div className='grid shrink-0 gap-4 border-b border-dashed bg-background/80 px-5 py-5 xl:grid-cols-2'>
            <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
              <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                左侧版本
              </div>
              <Select
                value={trace.leftVersionId}
                onValueChange={trace.setLeftVersionId}
              >
                <SelectTrigger className='mt-3 h-12 w-full rounded-2xl border-none bg-muted/50 px-4'>
                  <SelectValue placeholder='选择左侧版本' />
                </SelectTrigger>
                <SelectContent>
                  {trace.activeRecords.map((record) => (
                    <SelectItem key={record.id} value={record.id}>
                      #{record.versionSequence} / {record.displayVersionLabel} /{' '}
                      {record.createdAt || '—'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
              <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                右侧版本
              </div>
              <Select
                value={trace.rightVersionId}
                onValueChange={trace.setRightVersionId}
              >
                <SelectTrigger className='mt-3 h-12 w-full rounded-2xl border-none bg-muted/50 px-4'>
                  <SelectValue placeholder='选择右侧版本' />
                </SelectTrigger>
                <SelectContent>
                  {trace.activeRecords.map((record) => (
                    <SelectItem key={record.id} value={record.id}>
                      #{record.versionSequence} / {record.displayVersionLabel} /{' '}
                      {record.createdAt || '—'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <ScrollArea className='min-h-0 flex-1'>
            <div className='flex flex-col gap-4 px-5 py-5'>
              {!trace.hasAnyRecord ? (
                <div className='rounded-[32px] border border-dashed bg-muted/5 px-6 py-16 text-center'>
                  <div className='text-lg font-black tracking-tighter text-slate-700 uppercase italic'>
                    暂无版本记录
                  </div>
                  <div className='mt-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    当前对象还没有可用于对比的版本快照
                  </div>
                </div>
              ) : !trace.leftDetail ||
                !trace.rightDetail ||
                !trace.diffSummary ? (
                <div className='rounded-[32px] border border-dashed bg-muted/5 px-6 py-16 text-center'>
                  <div className='text-lg font-black tracking-tighter text-slate-700 uppercase italic'>
                    等待选择可对比版本
                  </div>
                  <div className='mt-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    至少需要两条版本记录才能生成差异结果
                  </div>
                </div>
              ) : (
                <>
                  <div className='grid gap-4 xl:grid-cols-4'>
                    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                      <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                        目标 BOM
                      </div>
                      <div className='mt-2 text-sm font-black tracking-tight text-slate-800'>
                        {trace.diffSummary.targetBomNo || '—'}
                      </div>
                    </div>
                    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                      <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                        新增物料
                      </div>
                      <div className='mt-2 text-sm font-black tracking-tight text-emerald-700'>
                        {trace.diffSummary.addedItems.length}
                      </div>
                    </div>
                    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                      <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                        移除物料
                      </div>
                      <div className='mt-2 text-sm font-black tracking-tight text-rose-700'>
                        {trace.diffSummary.removedItems.length}
                      </div>
                    </div>
                    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                      <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                        结构变化
                      </div>
                      <div className='mt-2 text-sm font-black tracking-tight text-amber-700'>
                        {trace.diffSummary.structureChanges.length}
                      </div>
                    </div>
                  </div>

                  <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                    <div className='flex items-center gap-2 text-primary'>
                      <Layers className='size-4' />
                      <div className='text-sm font-black tracking-tighter italic'>
                        版本对比总览
                      </div>
                    </div>
                    <div className='mt-4 grid gap-3 xl:grid-cols-2'>
                      <div className='rounded-2xl border border-dashed border-slate-200 bg-background p-4'>
                        <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                          左侧版本
                        </div>
                        <div className='mt-2 text-sm font-black tracking-tight text-slate-800'>
                          #{trace.leftDetail.versionSequence} /{' '}
                          {trace.leftDetail.displayVersionLabel}
                        </div>
                        <div className='mt-1 font-mono text-[8px] text-muted-foreground'>
                          {trace.leftDetail.createdAt || '—'}
                        </div>
                      </div>
                      <div className='rounded-2xl border border-dashed border-slate-200 bg-background p-4'>
                        <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                          右侧版本
                        </div>
                        <div className='mt-2 text-sm font-black tracking-tight text-slate-800'>
                          #{trace.rightDetail.versionSequence} /{' '}
                          {trace.rightDetail.displayVersionLabel}
                        </div>
                        <div className='mt-1 font-mono text-[8px] text-muted-foreground'>
                          {trace.rightDetail.createdAt || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='grid gap-4 xl:grid-cols-2'>
                    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                      <div className='text-sm font-black tracking-tighter italic'>
                        控制字段变化
                      </div>
                      <div className='mt-3 flex flex-col gap-3'>
                        {trace.diffSummary.controlChanges.length > 0 ? (
                          trace.diffSummary.controlChanges.map((change) => (
                            <FieldChangeCard
                              key={change.key}
                              label={change.key}
                              beforeValue={change.beforeValue}
                              afterValue={change.afterValue}
                            />
                          ))
                        ) : (
                          <div className='rounded-2xl border border-dashed bg-background p-4 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                            当前无控制字段变化
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                      <div className='text-sm font-black tracking-tighter italic'>
                        结构变化
                      </div>
                      <div className='mt-3 flex flex-col gap-3'>
                        {trace.diffSummary.structureChanges.length > 0 ? (
                          trace.diffSummary.structureChanges.map((change) => (
                            <FieldChangeCard
                              key={change.key}
                              label={change.key}
                              beforeValue={change.beforeValue}
                              afterValue={change.afterValue}
                            />
                          ))
                        ) : (
                          <div className='rounded-2xl border border-dashed bg-background p-4 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                            当前无结构变化
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className='grid gap-4 xl:grid-cols-3'>
                    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                      <div className='text-sm font-black tracking-tighter text-emerald-700 italic'>
                        新增物料
                      </div>
                      <div className='mt-3 flex flex-col gap-2'>
                        {trace.diffSummary.addedItems.length > 0 ? (
                          trace.diffSummary.addedItems.map((item) => (
                            <div
                              key={item.key}
                              className='rounded-2xl border border-dashed bg-background p-3'
                            >
                              <div className='text-[10px] font-black tracking-tight text-slate-800'>
                                {item.materialId}
                              </div>
                              <div className='mt-1 font-mono text-[8px] text-muted-foreground'>
                                {item.section || '未分段'}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className='rounded-2xl border border-dashed bg-background p-4 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                            当前无新增物料
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                      <div className='text-sm font-black tracking-tighter text-rose-700 italic'>
                        移除物料
                      </div>
                      <div className='mt-3 flex flex-col gap-2'>
                        {trace.diffSummary.removedItems.length > 0 ? (
                          trace.diffSummary.removedItems.map((item) => (
                            <div
                              key={item.key}
                              className='rounded-2xl border border-dashed bg-background p-3'
                            >
                              <div className='text-[10px] font-black tracking-tight text-slate-800'>
                                {item.materialId}
                              </div>
                              <div className='mt-1 font-mono text-[8px] text-muted-foreground'>
                                {item.section || '未分段'}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className='rounded-2xl border border-dashed bg-background p-4 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                            当前无移除物料
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                      <div className='text-sm font-black tracking-tighter text-amber-700 italic'>
                        修改物料
                      </div>
                      <div className='mt-3 flex flex-col gap-2'>
                        {trace.diffSummary.modifiedItems.length > 0 ? (
                          trace.diffSummary.modifiedItems.map((item) => (
                            <div
                              key={item.key}
                              className='rounded-2xl border border-dashed bg-background p-3'
                            >
                              <div className='text-[10px] font-black tracking-tight text-slate-800'>
                                {item.materialId}
                              </div>
                              <div className='mt-1 font-mono text-[8px] text-muted-foreground'>
                                {item.section || '未分段'}
                              </div>
                              <div className='mt-2 flex flex-wrap gap-1.5'>
                                {item.changedFields.map((field) => (
                                  <Badge
                                    key={field}
                                    variant='outline'
                                    className='h-5 rounded-full border-dashed bg-background font-mono text-[8px]'
                                  >
                                    {field}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className='rounded-2xl border border-dashed bg-background p-4 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                            当前无修改物料
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
