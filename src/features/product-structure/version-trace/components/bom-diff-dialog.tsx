'use client'

import { GitCompare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useBomPairDiff } from '../hooks/use-bom-pair-diff'
import { BomDiffContent } from './bom-diff-content'

interface BomDiffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 左侧版本快照 ID（bom_version_snapshots.id） */
  leftVersionId: string
  /** 右侧版本快照 ID（bom_version_snapshots.id） */
  rightVersionId: string
  /** 左侧标签，显示在弹窗头部，例如 "当前生产 BOM" */
  leftLabel?: string
  /** 右侧标签，例如 "研发优化中 / EBOM v2.0 草稿" */
  rightLabel?: string
  /** 弹窗标题，默认 "BOM 差异对比" */
  title?: string
  /** 弹窗副标题，描述本次对比的业务语义 */
  description?: string
}

/**
 * 通用 BOM 差异对比弹窗。
 *
 * 锁定双方版本，不允许在弹窗内切换其它版本作为对比基线。
 * 适合：
 * - MBOM 看到"研发优化中"徽章，点击查看 EBOM 草稿 vs 当前 MBOM 的对比
 * - EBOM 历史中给定两个版本直接对比
 * - 任何已知"左版本 + 右版本"的场景
 *
 * 探索式（带选择器）的 diff 请使用 BOMVersionTraceDialog。
 */
export function BomDiffDialog({
  open,
  onOpenChange,
  leftVersionId,
  rightVersionId,
  leftLabel,
  rightLabel,
  title = 'BOM 差异对比',
  description,
}: BomDiffDialogProps) {
  const { leftDetail, rightDetail, diffSummary, isLoading, error } =
    useBomPairDiff({ leftVersionId, rightVersionId, enabled: open })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='full'
        showCloseButton={false}
        className='grid h-[92vh] max-w-[min(1600px,calc(100%-2rem))] grid-rows-[auto_1fr] overflow-hidden rounded-[32px] border-none p-0 shadow-2xl'
        overlayClassName='bg-background/80 backdrop-blur-sm'
      >
        <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent' />
        <DialogHeader className='relative border-b border-dashed bg-muted/5 px-6 py-5 text-left'>
          <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
            <div className='space-y-2'>
              <div className='flex items-center gap-2 text-primary'>
                <GitCompare className='size-4' />
                <DialogTitle className='text-lg font-black tracking-tighter uppercase italic'>
                  {title}
                </DialogTitle>
              </div>
              <DialogDescription className='text-[9px] font-black tracking-widest uppercase opacity-60'>
                {description ??
                  '对比两个 BOM 版本快照的字段、结构与物料明细差异'}
              </DialogDescription>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              {leftLabel ? (
                <Badge
                  variant='outline'
                  className='h-5 rounded-full border-dashed border-rose-300 bg-rose-50 font-mono text-[8px] text-rose-700'
                >
                  左 · {leftLabel}
                </Badge>
              ) : null}
              {rightLabel ? (
                <Badge
                  variant='outline'
                  className='h-5 rounded-full border-dashed border-emerald-300 bg-emerald-50 font-mono text-[8px] text-emerald-700'
                >
                  右 · {rightLabel}
                </Badge>
              ) : null}
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                className='h-11 rounded-full border-dashed px-5 text-[10px] font-black tracking-widest uppercase'
              >
                关闭
              </Button>
            </div>
          </div>
        </DialogHeader>

        <BomDiffContent
          leftDetail={leftDetail}
          rightDetail={rightDetail}
          diffSummary={diffSummary}
          isLoading={isLoading}
          error={error}
          leftLabel={leftLabel}
          rightLabel={rightLabel}
          className='min-h-0'
        />
      </DialogContent>
    </Dialog>
  )
}
