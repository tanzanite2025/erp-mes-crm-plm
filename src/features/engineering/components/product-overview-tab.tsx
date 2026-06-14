'use client'

import { useMemo } from 'react'
import { type TranslationKey } from '@/locales'
import { Settings2 } from 'lucide-react'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { BOMVersionTraceTrigger } from '@/features/product-structure/version-trace/components/bom-version-trace-trigger'
import { type Product, type ProductType } from '../data/schema'
import { type EngineeringProductDisplayMetadata } from '../hooks/use-engineering-product-display-metadata'
import { ProductActiveBOMCard } from './product-active-bom-card'
import { renderProductSpecOverview } from './specs'

type ProductOverviewTabProps = {
  product: Product
  productTypes: ProductType[]
  displayMetadata?: EngineeringProductDisplayMetadata | null
  onEdit: (product: Product) => void
}

export function ProductOverviewTab({
  product,
  productTypes,
  displayMetadata,
  onEdit,
}: ProductOverviewTabProps) {
  const { t } = useLanguage()
  const bindingInfoKey = 'engineering.productMgmt.bindingInfo' as TranslationKey

  const categoryType = useMemo(
    () => productTypes.find((entry) => entry.id === product.typeId) || null,
    [product.typeId, productTypes]
  )
  const overviewTemplateKey =
    displayMetadata?.resolvedTemplate?.componentKey ||
    product.resolvedTemplateKey ||
    product.templateKey

  if (!categoryType) {
    const error = new Error(
      `[CRITICAL] Missing product type ${product.typeId} for product overview ${product.id}`
    )
    failLoudly(error, 'ProductOverviewTab.categoryType')
    throw error
  }

  return (
    <div className='mt-0 space-y-4 sm:space-y-5'>
      {/* 产品身份抬头：UDS 1.0 标准对齐 */}
      <div className='mb-2 flex items-end justify-between border-b-2 border-dashed border-muted pb-5'>
        <div className='space-y-3'>
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-2'>
              <div className='size-2 animate-pulse rounded-full bg-blue-600' />
              <span className='text-[9px] leading-none font-black tracking-widest text-blue-600/60 uppercase'>
                {t('engineering.productMgmt.technicalArchive')}
              </span>
            </div>
            <div className='group/header-title flex items-center gap-1 sm:gap-3'>
              <h1 className='text-2xl leading-none font-black tracking-tighter break-all text-slate-800 uppercase italic sm:text-4xl'>
                {product.name}
              </h1>
              <Button
                variant='ghost'
                size='icon'
                className='size-8 rounded-xl border border-transparent opacity-100 transition-all hover:border-blue-600/20 hover:bg-blue-600/10 hover:text-blue-600 sm:size-9 sm:opacity-0 sm:group-hover/header-title:opacity-100'
                onClick={() => onEdit(product)}
              >
                <Settings2 className='size-4 sm:size-5' />
              </Button>
            </div>
          </div>
          <div className='flex items-center gap-4 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
            <div className='flex items-center gap-1.5'>
              <span className='opacity-40'>
                {t('engineering.productMgmt.skuIdLabel')}:
              </span>
              <span className='rounded bg-muted/50 px-2 py-0.5 font-mono font-bold text-slate-800'>
                #{product.sku}
              </span>
            </div>
          </div>
        </div>
        <div className='flex flex-col items-start gap-2 sm:items-end'>
          <Badge
            variant='secondary'
            className='h-7 rounded-full border-none bg-blue-600/5 px-4 text-[9px] font-black tracking-widest text-blue-600 uppercase italic shadow-inner sm:h-8 sm:px-6 sm:text-[10px]'
          >
            {t('engineering.productMgmt.typeRefLabel')} / {categoryType!.code}
          </Badge>
          <div className='flex flex-wrap items-center gap-2'>
            <BOMVersionTraceTrigger
              productId={product.id}
              targetName={product.name}
              label='BOM 版本'
            />
            <AuditTimelineTriggerButton
              module={AUDIT_MODULES.product}
              targetId={product.id}
              targetName={product.name}
              label={t('common.audit.trigger')}
            />
          </div>
        </div>
      </div>

      {/* 全宽技术规格看板 */}
      <div className='relative'>
        {renderProductSpecOverview({
          product,
          categoryName: categoryType.name,
          templateKey: overviewTemplateKey,
        })}
      </div>

      {/* 当前激活 BOM 版本 + 重量 (方案 B：唯一权威源) */}
      <ProductActiveBOMCard productId={product.id} productName={product.name} />

      <Card className='overflow-hidden rounded-[20px] border-2 border-dashed border-blue-600/15 bg-blue-600/3 shadow-none transition-all hover:bg-blue-600/5'>
        <div className='flex flex-col items-start gap-3 px-3 py-3 sm:flex-row sm:items-center sm:gap-5 sm:px-4 sm:py-4'>
          <div className='flex shrink-0 flex-col gap-1'>
            <div className='rounded-md bg-blue-600 px-3 py-1 text-[9px] font-black tracking-widest text-white uppercase italic shadow-lg shadow-blue-600/20'>
              {t(bindingInfoKey)}
            </div>
          </div>
          <div className='grid flex-1 grid-cols-1 gap-3 xl:grid-cols-2'>
            <div className='rounded-[18px] border border-dashed border-blue-600/15 bg-background/80 px-3 py-2.5'>
              <div className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('engineering.productMgmt.form.spec')}
              </div>
              <div className='mt-1 text-[13px] font-black tracking-tight break-all text-slate-800 italic'>
                {displayMetadata?.engineeringSpecLabel ||
                  t('engineering.productMgmt.noBinding')}
              </div>
            </div>
            <div className='rounded-[18px] border border-dashed border-blue-600/15 bg-background/80 px-3 py-2.5'>
              <div className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('engineering.productMgmt.form.mold')}
              </div>
              <div className='mt-1 text-[13px] font-black tracking-tight break-all text-slate-800 italic'>
                {product.moldGroup || t('engineering.productMgmt.noBinding')}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 特殊约束区域 */}
      <Card className='group overflow-hidden rounded-[20px] border-2 border-dashed border-rose-500/20 bg-rose-500/2 shadow-none transition-all hover:bg-rose-500/5'>
        <div className='flex flex-col items-start gap-3 px-3 py-3 sm:flex-row sm:items-center sm:gap-5 sm:px-4 sm:py-4'>
          <div className='flex shrink-0 flex-col gap-1'>
            <div className='rounded-md bg-rose-500 px-3 py-1 text-[9px] font-black tracking-widest text-white uppercase italic shadow-lg shadow-rose-500/20'>
              {t('engineering.productMgmt.riskConstraints')}
            </div>
          </div>
          <div className='flex flex-1 flex-wrap gap-2.5'>
            {product.restrictions && product.restrictions.length > 0 ? (
              product.restrictions.map((tag) => (
                <Badge
                  key={tag}
                  variant='outline'
                  className='rounded-full border-rose-200/50 bg-background/50 px-4 py-1.5 text-[10px] font-black tracking-tight text-rose-700 uppercase shadow-sm'
                >
                  {tag}
                </Badge>
              ))
            ) : (
              <span className='text-[10px] font-black tracking-widest text-muted-foreground/30 uppercase italic'>
                {t('engineering.productMgmt.noProductionRestrictionsRecorded')}
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
