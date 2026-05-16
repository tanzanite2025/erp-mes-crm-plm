'use client'

import { AlertCircle, ArrowUpRight, Layers, Plus } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useActiveBOM } from '@/features/product-structure/hooks/use-active-bom'
import { cn } from '@/lib/utils'

interface ProductActiveBOMCardProps {
  productId: string
  productName: string
}

/**
 * 产品概览页的"当前 BOM 版本/重量"卡片。
 *
 * 方案 B：BOM 是产品最终重量 + 版本的端到端权威源，本卡片只读 BOM。
 *  - released → 显示 bomVersion + measuredWeight + 单位
 *  - draft（无 RELEASED）→ 灰色降级，提示"草稿待发布"
 *  - none → 引导建首份 BOM
 *  - error / loading → 占位骨架
 */
export function ProductActiveBOMCard({ productId, productName }: ProductActiveBOMCardProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const resource = useActiveBOM(productId)

  const goToBomMgmt = () => {
    navigate({ to: '/product-structure/bom' as never }).catch(() => undefined)
  }

  if (resource.status === 'loading') {
    return (
      <Card className='rounded-[20px] border-2 border-dashed border-emerald-600/15 bg-emerald-600/3 shadow-none overflow-hidden'>
        <div className='px-3 sm:px-4 py-3 sm:py-4'>
          <div className='h-12 rounded-xl bg-muted/50 animate-pulse' />
        </div>
      </Card>
    )
  }

  if (resource.status === 'error') {
    return (
      <Card className='rounded-[20px] border-2 border-dashed border-rose-400/40 bg-rose-50/40 shadow-none overflow-hidden'>
        <div className='px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-3'>
          <AlertCircle className='size-4 text-rose-500' />
          <span className='text-[11px] font-black uppercase tracking-widest text-rose-600'>
            {t('engineering.productMgmt.activeBom.loadFailed')}
          </span>
        </div>
      </Card>
    )
  }

  if (resource.status === 'none') {
    return (
      <Card className='rounded-[20px] border-2 border-dashed border-slate-300 bg-slate-50/40 shadow-none overflow-hidden'>
        <div className='px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='px-3 py-1 bg-slate-500 text-white text-[9px] font-black uppercase tracking-widest italic rounded-md shadow-lg shadow-slate-500/20'>
              {t('engineering.productMgmt.activeBom.label')}
            </div>
            <span className='text-[11px] font-bold text-slate-600'>
              {t('engineering.productMgmt.activeBom.noBomYet', { product: productName })}
            </span>
          </div>
          <Button
            onClick={goToBomMgmt}
            className='h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4 text-[10px] font-black uppercase tracking-widest gap-1.5 active:scale-95 transition-all'
          >
            <Plus className='size-3' />
            {t('engineering.productMgmt.activeBom.createFirstBom')}
          </Button>
        </div>
      </Card>
    )
  }

  if (resource.status === 'draft') {
    const draft = resource.draftBom!
    return (
      <Card className='rounded-[20px] border-2 border-dashed border-amber-400/40 bg-amber-50/40 shadow-none overflow-hidden'>
        <div className='px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='px-3 py-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest italic rounded-md shadow-lg shadow-amber-500/20'>
              {t('engineering.productMgmt.activeBom.label')}
            </div>
            <div className='flex flex-col gap-0.5'>
              <span className='text-[11px] font-black uppercase tracking-widest text-amber-700'>
                {t('engineering.productMgmt.activeBom.draftStatus', { version: draft.bomVersion })}
              </span>
              <span className='text-[10px] font-bold text-muted-foreground/60'>
                {t('engineering.productMgmt.activeBom.draftHint')}
              </span>
            </div>
          </div>
          <Button
            variant='outline'
            onClick={goToBomMgmt}
            className='h-8 rounded-full border-amber-300 bg-background hover:bg-amber-100 text-amber-700 px-4 text-[10px] font-black uppercase tracking-widest gap-1.5 active:scale-95 transition-all'
          >
            <ArrowUpRight className='size-3' />
            {t('engineering.productMgmt.activeBom.openBom')}
          </Button>
        </div>
      </Card>
    )
  }

  // released
  const bom = resource.bom!
  const isMfg = bom.bomType === 'MBOM'
  const weightLabel = bom.measuredWeight && bom.measuredWeight > 0
    ? `${bom.measuredWeight}${(bom.measuredWeightUnit || 'g').trim() || 'g'}`
    : '—'

  return (
    <Card className='rounded-[20px] border-2 border-dashed border-emerald-600/30 bg-emerald-600/5 shadow-none overflow-hidden hover:bg-emerald-600/10 transition-all'>
      <div className='px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5'>
        <div className='flex flex-col gap-1 shrink-0'>
          <div className='px-3 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest italic rounded-md shadow-lg shadow-emerald-600/20'>
            {t('engineering.productMgmt.activeBom.label')}
          </div>
          <Badge
            variant='outline'
            className={cn(
              'h-4 px-1.5 text-[8px] font-black uppercase tracking-widest border-none',
              isMfg ? 'bg-indigo-500/10 text-indigo-700' : 'bg-blue-500/10 text-blue-700'
            )}
          >
            {t(`engineering.dict.${bom.bomType}` as any)}
          </Badge>
        </div>

        <div className='flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3'>
          <div className='rounded-[14px] border border-dashed border-emerald-600/20 bg-background/80 px-3 py-2'>
            <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('engineering.productMgmt.activeBom.bomNo')}
            </div>
            <div className='mt-0.5 break-all font-mono text-[12px] font-black text-slate-800'>
              {bom.bomNo}
            </div>
          </div>
          <div className='rounded-[14px] border border-dashed border-emerald-600/20 bg-background/80 px-3 py-2'>
            <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('engineering.productMgmt.activeBom.version')}
            </div>
            <div className='mt-0.5 font-mono text-[14px] font-black text-blue-600 tracking-tighter italic'>
              {bom.bomVersion}
            </div>
          </div>
          <div className='rounded-[14px] border border-dashed border-emerald-600/20 bg-background/80 px-3 py-2'>
            <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('engineering.productMgmt.activeBom.weight')}
            </div>
            <div className='mt-0.5 font-mono text-[14px] font-black text-emerald-700 tracking-tighter italic'>
              {weightLabel}
            </div>
          </div>
          <div className='rounded-[14px] border border-dashed border-emerald-600/20 bg-background/80 px-3 py-2'>
            <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('engineering.productMgmt.activeBom.lines')}
            </div>
            <div className='mt-0.5 flex items-center gap-1 text-[12px] font-black text-slate-700'>
              <Layers className='size-3.5 opacity-60' />
              <span>{bom.items?.length ?? 0}</span>
            </div>
          </div>
        </div>

        <Button
          variant='outline'
          onClick={goToBomMgmt}
          className='h-8 rounded-full border-emerald-400 bg-background hover:bg-emerald-100 text-emerald-700 px-4 text-[10px] font-black uppercase tracking-widest gap-1.5 active:scale-95 transition-all shrink-0'
        >
          <ArrowUpRight className='size-3' />
          {t('engineering.productMgmt.activeBom.openBom')}
        </Button>
      </div>
    </Card>
  )
}
