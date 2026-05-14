'use client'

import { Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { type BOMVersionRecordDetail } from '../contracts/bom-version-trace'
import { type BOMVersionDiffSummary } from '../utils/bom-version-diff'

interface BomDiffContentProps {
  leftDetail: BOMVersionRecordDetail | null
  rightDetail: BOMVersionRecordDetail | null
  diffSummary: BOMVersionDiffSummary | null
  isLoading: boolean
  error: unknown
  /** 左侧自定义标签（如"当前生产 BOM"），不传则使用版本号 */
  leftLabel?: string
  /** 右侧自定义标签（如"研发优化中 EBOM v2.0 草稿"），不传则使用版本号 */
  rightLabel?: string
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
      <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
        {label}
      </div>
      <div className='mt-3 grid gap-3 xl:grid-cols-2'>
        <div className='rounded-2xl border border-dashed border-rose-500/20 bg-rose-500/5 p-3'>
          <div className='text-[8px] font-black uppercase tracking-widest text-rose-700/60'>
            左侧版本
          </div>
          <div className='mt-1 break-all text-[11px] font-mono text-rose-700'>
            {renderValue(beforeValue)}
          </div>
        </div>
        <div className='rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/5 p-3'>
          <div className='text-[8px] font-black uppercase tracking-widest text-emerald-700/60'>
            右侧版本
          </div>
          <div className='mt-1 break-all text-[11px] font-mono text-emerald-700'>
            {renderValue(afterValue)}
          </div>
        </div>
      </div>
    </div>
  )
}

export function BomDiffContent({
  leftDetail,
  rightDetail,
  diffSummary,
  isLoading,
  error,
  leftLabel,
  rightLabel,
  className,
}: BomDiffContentProps) {
  return (
    <div className={cn('flex min-h-0 flex-col overflow-hidden', className)}>
      <ScrollArea className='min-h-0 flex-1'>
        <div className='flex flex-col gap-4 px-5 py-5'>
          {isLoading ? (
            <div className='rounded-[32px] border border-dashed bg-muted/5 px-6 py-16 text-center'>
              <div className='text-lg font-black tracking-tighter italic uppercase text-slate-700'>
                正在加载对比数据...
              </div>
            </div>
          ) : error ? (
            <div className='rounded-[32px] border border-dashed border-rose-300 bg-rose-50/60 px-6 py-16 text-center'>
              <div className='text-lg font-black tracking-tighter italic uppercase text-rose-700'>
                对比数据加载失败
              </div>
              <div className='mt-2 text-[10px] font-black uppercase tracking-widest text-rose-700/60'>
                请稍后重试或联系管理员
              </div>
            </div>
          ) : !leftDetail || !rightDetail ? (
            <div className='rounded-[32px] border border-dashed bg-muted/5 px-6 py-16 text-center'>
              <div className='text-lg font-black tracking-tighter italic uppercase text-slate-700'>
                等待对比数据
              </div>
              <div className='mt-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                需要两条版本快照才能生成差异结果
              </div>
            </div>
          ) : !diffSummary ? (
            <div className='rounded-[32px] border border-dashed bg-muted/5 px-6 py-16 text-center'>
              <div className='text-lg font-black tracking-tighter italic uppercase text-slate-700'>
                两侧为同一版本
              </div>
              <div className='mt-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                无差异可显示
              </div>
            </div>
          ) : (
            <>
              <div className='grid gap-4 xl:grid-cols-4'>
                <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                  <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                    目标 BOM
                  </div>
                  <div className='mt-2 text-sm font-black tracking-tight text-slate-800'>
                    {diffSummary.targetBomNo || '—'}
                  </div>
                </div>
                <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                  <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                    新增物料
                  </div>
                  <div className='mt-2 text-sm font-black tracking-tight text-emerald-700'>
                    {diffSummary.addedItems.length}
                  </div>
                </div>
                <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                  <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                    移除物料
                  </div>
                  <div className='mt-2 text-sm font-black tracking-tight text-rose-700'>
                    {diffSummary.removedItems.length}
                  </div>
                </div>
                <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                  <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                    结构变化
                  </div>
                  <div className='mt-2 text-sm font-black tracking-tight text-amber-700'>
                    {diffSummary.structureChanges.length}
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
                    <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      {leftLabel || '左侧版本'}
                    </div>
                    <div className='mt-2 text-sm font-black tracking-tight text-slate-800'>
                      #{leftDetail.versionSequence} / {leftDetail.displayVersionLabel}
                    </div>
                    <div className='mt-1 text-[8px] font-mono text-muted-foreground'>
                      {leftDetail.bomNo}
                    </div>
                    <div className='mt-1 text-[8px] font-mono text-muted-foreground'>
                      {leftDetail.createdAt || '—'}
                    </div>
                  </div>
                  <div className='rounded-2xl border border-dashed border-slate-200 bg-background p-4'>
                    <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      {rightLabel || '右侧版本'}
                    </div>
                    <div className='mt-2 text-sm font-black tracking-tight text-slate-800'>
                      #{rightDetail.versionSequence} / {rightDetail.displayVersionLabel}
                    </div>
                    <div className='mt-1 text-[8px] font-mono text-muted-foreground'>
                      {rightDetail.bomNo}
                    </div>
                    <div className='mt-1 text-[8px] font-mono text-muted-foreground'>
                      {rightDetail.createdAt || '—'}
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
                    {diffSummary.controlChanges.length > 0 ? (
                      diffSummary.controlChanges.map((change) => (
                        <FieldChangeCard
                          key={change.key}
                          label={change.key}
                          beforeValue={change.beforeValue}
                          afterValue={change.afterValue}
                        />
                      ))
                    ) : (
                      <div className='rounded-2xl border border-dashed bg-background p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
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
                    {diffSummary.structureChanges.length > 0 ? (
                      diffSummary.structureChanges.map((change) => (
                        <FieldChangeCard
                          key={change.key}
                          label={change.key}
                          beforeValue={change.beforeValue}
                          afterValue={change.afterValue}
                        />
                      ))
                    ) : (
                      <div className='rounded-2xl border border-dashed bg-background p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                        当前无结构变化
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className='grid gap-4 xl:grid-cols-3'>
                <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                  <div className='text-sm font-black tracking-tighter italic text-emerald-700'>
                    新增物料
                  </div>
                  <div className='mt-3 flex flex-col gap-2'>
                    {diffSummary.addedItems.length > 0 ? (
                      diffSummary.addedItems.map((item) => (
                        <div
                          key={item.key}
                          className='rounded-2xl border border-dashed bg-background p-3'
                        >
                          <div className='text-[10px] font-black tracking-tight text-slate-800'>
                            {item.materialId}
                          </div>
                          <div className='mt-1 text-[8px] font-mono text-muted-foreground'>
                            {item.section || '未分段'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='rounded-2xl border border-dashed bg-background p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                        当前无新增物料
                      </div>
                    )}
                  </div>
                </div>

                <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                  <div className='text-sm font-black tracking-tighter italic text-rose-700'>
                    移除物料
                  </div>
                  <div className='mt-3 flex flex-col gap-2'>
                    {diffSummary.removedItems.length > 0 ? (
                      diffSummary.removedItems.map((item) => (
                        <div
                          key={item.key}
                          className='rounded-2xl border border-dashed bg-background p-3'
                        >
                          <div className='text-[10px] font-black tracking-tight text-slate-800'>
                            {item.materialId}
                          </div>
                          <div className='mt-1 text-[8px] font-mono text-muted-foreground'>
                            {item.section || '未分段'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='rounded-2xl border border-dashed bg-background p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                        当前无移除物料
                      </div>
                    )}
                  </div>
                </div>

                <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
                  <div className='text-sm font-black tracking-tighter italic text-amber-700'>
                    修改物料
                  </div>
                  <div className='mt-3 flex flex-col gap-2'>
                    {diffSummary.modifiedItems.length > 0 ? (
                      diffSummary.modifiedItems.map((item) => (
                        <div
                          key={item.key}
                          className='rounded-2xl border border-dashed bg-background p-3'
                        >
                          <div className='text-[10px] font-black tracking-tight text-slate-800'>
                            {item.materialId}
                          </div>
                          <div className='mt-1 text-[8px] font-mono text-muted-foreground'>
                            {item.section || '未分段'}
                          </div>
                          <div className='mt-2 flex flex-wrap gap-1.5'>
                            {item.changedFields.map((field) => (
                              <Badge
                                key={field}
                                variant='outline'
                                className='h-5 rounded-full border-dashed bg-background text-[8px] font-mono'
                              >
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='rounded-2xl border border-dashed bg-background p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
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
  )
}
