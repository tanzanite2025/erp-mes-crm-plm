'use client'

import { useMemo } from 'react'

import { Settings2 } from 'lucide-react'
import { type TranslationKey } from '@/locales'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { BOMVersionTraceTrigger } from '@/features/product-structure/version-trace/components/bom-version-trace-trigger'
import { failLoudly } from '@/lib/safe-catch'
import { renderProductSpecOverview } from './specs'
import { ProductActiveBOMCard } from './product-active-bom-card'
import { type Product, type ProductType } from '../data/schema'
import { type EngineeringProductDisplayMetadata } from '../hooks/use-engineering-product-display-metadata'

type ProductOverviewTabProps = {
    product: Product
    productTypes: ProductType[]
    displayMetadata?: EngineeringProductDisplayMetadata | null
    onEdit: (product: Product) => void
}

export function ProductOverviewTab({ product, productTypes, displayMetadata, onEdit }: ProductOverviewTabProps) {
    const { t } = useLanguage()
    const bindingInfoKey = 'engineering.productMgmt.bindingInfo' as TranslationKey

    const categoryType = useMemo(
        () => productTypes.find((entry) => entry.id === product.typeId) || null,
        [product.typeId, productTypes]
    )
    const overviewTemplateKey = displayMetadata?.resolvedTemplate?.componentKey
        || product.resolvedTemplateKey
        || product.templateKey

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
            <div className='flex items-end justify-between border-b-2 border-dashed border-muted pb-5 mb-2'>
                <div className='space-y-3'>
                    <div className='flex flex-col gap-1'>
                         <div className='flex items-center gap-2'>
                            <div className='size-2 bg-blue-600 rounded-full animate-pulse' />
                            <span className='text-[9px] font-black uppercase tracking-widest text-blue-600/60 leading-none'>{t('engineering.productMgmt.technicalArchive')}</span>
                        </div>
                        <div className='flex items-center gap-1 sm:gap-3 group/header-title'>
                            <h1 className='text-2xl sm:text-4xl font-black tracking-tighter uppercase italic text-slate-800 leading-none break-all'>{product.name}</h1>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='size-8 sm:size-9 rounded-xl opacity-100 sm:opacity-0 sm:group-hover/header-title:opacity-100 hover:bg-blue-600/10 hover:text-blue-600 transition-all border border-transparent hover:border-blue-600/20'
                                onClick={() => onEdit(product)}
                            >
                                <Settings2 className='size-4 sm:size-5' />
                            </Button>
                        </div>
                    </div>
                    <div className='flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                        <div className='flex items-center gap-1.5'>
                            <span className='opacity-40'>{t('engineering.productMgmt.skuIdLabel')}:</span>
                            <span className='font-mono font-bold text-slate-800 bg-muted/50 px-2 py-0.5 rounded'>#{product.sku}</span>
                        </div>
                    </div>
                </div>
                <div className='flex flex-col items-start sm:items-end gap-2'>
                    <Badge variant='secondary' className='h-7 sm:h-8 px-4 sm:px-6 rounded-full text-[9px] sm:text-[10px] font-black bg-blue-600/5 border-none uppercase tracking-widest text-blue-600 italic shadow-inner'>
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

            <Card className='rounded-[20px] border-2 border-dashed border-blue-600/15 bg-blue-600/3 shadow-none overflow-hidden hover:bg-blue-600/5 transition-all'>
                <div className='px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5'>
                    <div className='flex flex-col gap-1 shrink-0'>
                        <div className='px-3 py-1 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest italic rounded-md shadow-lg shadow-blue-600/20'>
                            {t(bindingInfoKey)}
                        </div>
                    </div>
                    <div className='flex-1 grid grid-cols-1 xl:grid-cols-2 gap-3'>
                        <div className='rounded-[18px] border border-dashed border-blue-600/15 bg-background/80 px-3 py-2.5'>
                            <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>
                                {t('engineering.productMgmt.form.spec')}
                            </div>
                            <div className='mt-1 break-all text-[13px] font-black tracking-tight text-slate-800 italic'>
                                {displayMetadata?.engineeringSpecLabel || t('engineering.productMgmt.noBinding')}
                            </div>
                        </div>
                        <div className='rounded-[18px] border border-dashed border-blue-600/15 bg-background/80 px-3 py-2.5'>
                            <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>
                                {t('engineering.productMgmt.form.mold')}
                            </div>
                            <div className='mt-1 break-all text-[13px] font-black tracking-tight text-slate-800 italic'>
                                {product.moldGroup || t('engineering.productMgmt.noBinding')}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* 特殊约束区域 */}
            <Card className='rounded-[20px] border-2 border-dashed border-rose-500/20 bg-rose-500/2 shadow-none overflow-hidden hover:bg-rose-500/5 transition-all group'>
                <div className='px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5'>
                     <div className='flex flex-col gap-1 shrink-0'>
                        <div className='px-3 py-1 bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest italic rounded-md shadow-lg shadow-rose-500/20'>
                            {t('engineering.productMgmt.riskConstraints')}
                        </div>
                    </div>
                    <div className='flex-1 flex flex-wrap gap-2.5'>
                        {product.restrictions && product.restrictions.length > 0 ? (
                            product.restrictions.map(tag => (
                                <Badge key={tag} variant='outline' className='bg-background/50 border-rose-200/50 text-rose-700 py-1.5 px-4 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm'>
                                    {tag}
                                </Badge>
                            ))
                        ) : (
                            <span className='text-[10px] text-muted-foreground/30 font-black uppercase tracking-widest italic'>{t('engineering.productMgmt.noProductionRestrictionsRecorded')}</span>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    )
}
