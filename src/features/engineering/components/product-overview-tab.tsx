'use client'

import { useState, useEffect } from 'react'
import { Settings2, ArrowUpDown, FileText, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { SPEC_COMPONENTS, getEffectiveTemplate } from './specs'
import { type Product, type ProductTemplate, type ProductType } from '../data/schema'
import { ProductTypeService } from '../services/product-type-service'

type ProductOverviewTabProps = {
    product: Product
    onEdit: (product: Product) => void
}

export function ProductOverviewTab({ product, onEdit }: ProductOverviewTabProps) {
    const { t } = useLanguage()
    const [categoryType, setCategoryType] = useState<ProductType | null>(null)
    const [boundTemplate, setBoundTemplate] = useState<ProductTemplate | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadTemplateData = async () => {
            setIsLoading(true)
            try {
                const types = await ProductTypeService.getProductTypes()
                const type = types.find((entry) => entry.id === product.typeId) || null
                setCategoryType(type)
                
                const tpl = await getEffectiveTemplate(type ?? undefined)
                setBoundTemplate(tpl)
            } finally {
                setIsLoading(false)
            }
        }
        loadTemplateData()
    }, [product.typeId])

    const renderTechnicalRibbon = () => {
        if (isLoading) {
            return (
                <div className='flex items-center gap-4 p-4 rounded-2xl bg-muted/10 border border-dashed animate-pulse'>
                   <div className='flex-1 flex items-center justify-around px-2'>
                        <div className='h-8 w-24 bg-muted rounded' />
                        <div className='w-px h-8 bg-muted' />
                        <div className='h-8 w-24 bg-muted rounded' />
                        <div className='w-px h-8 bg-muted' />
                        <div className='h-8 w-32 bg-muted rounded' />
                   </div>
                </div>
            )
        }

        if (!boundTemplate) {
            return (
                <div className='flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-dashed shadow-sm'>
                        <div className='flex-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-around gap-4 sm:gap-2 px-2'>
                         <div className='flex flex-col gap-1'>
                            <span className='text-[8px] sm:text-[10px] text-muted-foreground font-black uppercase tracking-widest'>{t('engineering.productMgmt.coreCategory')}</span>
                            <span className='text-lg sm:text-xl font-black text-foreground'>{categoryType?.name || t('engineering.productMgmt.genericParts')}</span>
                        </div>
                        <div className='hidden sm:block w-px h-8 bg-muted' />
                         <div className='flex flex-col gap-1'>
                            <span className='text-[8px] sm:text-[10px] text-muted-foreground font-black uppercase tracking-widest'>{t('engineering.productMgmt.estimatedWeight')}</span>
                            <div className='flex items-baseline gap-1'>
                                <span className='text-xl sm:text-2xl font-mono font-black text-foreground'>{product.weight || '-'}</span>
                                <span className='text-[10px] font-bold opacity-40'>g</span>
                            </div>
                        </div>
                        <div className='hidden sm:block w-px h-8 bg-muted' />
                        <div className='flex items-center gap-2 text-muted-foreground/40 italic text-[10px] font-bold uppercase tracking-tighter'>
                            <Settings2 className='size-3' />
                            {t('engineering.productMgmt.genericSpecMode')}
                        </div>
                    </div>
                </div>
            )
        }

        const componentKey = boundTemplate.componentKey as keyof typeof SPEC_COMPONENTS
        const SpecOverview = SPEC_COMPONENTS[componentKey]?.overview
        if (!SpecOverview) return null

        return (
            <div className='relative'>
                {!categoryType?.templateId && (
                    <div className='absolute -top-3 left-6 z-10 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-bold rounded-full shadow-sm animate-bounce'>
                        {t('engineering.productMgmt.smartIdentify')}: {boundTemplate.name}
                    </div>
                )}
                <SpecOverview product={product} />
            </div>
        )
    }

    return (
        <div className='mt-0 space-y-6'>
            {/* 产品身份抬头：UDS 1.0 标准对齐 */}
            <div className='flex items-end justify-between border-b-2 border-dashed border-muted pb-8 mb-4'>
                <div className='space-y-4'>
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
                        <div className='w-px h-3 bg-muted-foreground/20' />
                        <div className='flex items-center gap-1.5'>
                            <span className='opacity-40'>{t('engineering.productMgmt.moldGroupLabel')}:</span>
                            <span className='font-mono font-bold text-slate-800 bg-muted/50 px-2 py-0.5 rounded'>{product.moldGroup || t('engineering.productMgmt.noBinding')}</span>
                        </div>
                    </div>
                </div>
                <div className='flex flex-col items-start sm:items-end gap-2'>
                    <Badge variant='secondary' className='h-7 sm:h-8 px-4 sm:px-6 rounded-full text-[9px] sm:text-[10px] font-black bg-blue-600/5 border-none uppercase tracking-widest text-blue-600 italic shadow-inner'>
                        {t('engineering.productMgmt.typeRefLabel')} / {product.sku.split('-')[0] || t('engineering.productMgmt.genericTypeRef')}
                    </Badge>
                </div>
            </div>

            {/* 全宽技术规格看板 */}
            {renderTechnicalRibbon()}

            {/* 特殊约束区域 */}
            <Card className='rounded-[24px] border-2 border-dashed border-rose-500/20 bg-rose-500/[0.02] shadow-none overflow-hidden hover:bg-rose-500/[0.05] transition-all group'>
                <div className='px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8'>
                     <div className='flex flex-col gap-1 shrink-0'>
                        <div className='px-3 py-1 bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest rounded-md shadow-lg shadow-rose-500/20'>
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

            {/* 变更记录 (收纳在主页) */}
            <div className='space-y-4 pt-4'>
                <div className='flex items-center gap-3 text-muted-foreground/40'>
                    <div className='h-px flex-1 bg-muted-foreground/10 border-t border-dashed' />
                     <div className='flex items-center gap-2'>
                        <ArrowUpDown className='size-3' />
                        <span className='text-[10px] uppercase font-black tracking-widest'>{t('engineering.productMgmt.archiveLog')}</span>
                    </div>
                    <div className='h-px flex-1 bg-muted-foreground/10 border-t border-dashed' />
                </div>
                <div className='rounded-[24px] border-2 border-dashed border-muted/50 bg-muted/5 p-6 flex items-center gap-6 group cursor-pointer hover:bg-muted/10 transition-all shadow-none'>
                    <div className='size-12 rounded-2xl bg-background border border-muted/20 flex items-center justify-center group-hover:bg-blue-600 transition-all shadow-inner'>
                        <FileText className='size-5 text-muted-foreground group-hover:text-white transition-colors' />
                    </div>
                     <div className='flex-1'>
                        <p className='text-sm font-black text-slate-700 uppercase tracking-tight italic'>{t('engineering.productMgmt.initialArchiveVersion')}</p>
                        <p className='text-[10px] font-black text-muted-foreground/40 mt-1 uppercase tracking-widest font-mono'>
                            {new Date(product.createdAt).toLocaleDateString()} // {t('engineering.productMgmt.autoGenerated')}
                        </p>
                    </div>
                    <div className='size-8 rounded-full bg-background border border-muted/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all'>
                        <ChevronRight className='size-4 text-blue-600' />
                    </div>
                </div>
            </div>
        </div>
    )
}
