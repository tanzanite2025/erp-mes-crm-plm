'use client'

import { useMemo } from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SelectDropdown } from '@/components/select-dropdown'
import { Badge } from '@/components/ui/badge'
import type { UseFormReturn } from 'react-hook-form'
import { type Product, type ProductType } from '../../data/schema'

import { ImageIcon, X } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import {
  normalizeProductModelCodeValue,
} from '../../utils/product-code-normalization'
import { buildProductTypeHierarchyMetaMap } from '../../utils/product-type-tree'

interface ProductBasicInfoProps {
    form: UseFormReturn<Product>
    dynamicTypes: ProductType[]
    productTypes: ProductType[]
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
    bomOptions: { label: string; value: string }[]
    isBomOptionsPending?: boolean
    specOptions: { label: string; value: string }[]
    moldOptions: { label: string; value: string }[]
    isEdit: boolean
    templateLabel?: string
}

function RequiredMark() {
    return <span className='text-destructive text-[11px] leading-none'>*</span>
}

export function ProductBasicInfo({
    form,
    dynamicTypes,
    productTypes,
    handleImageUpload,
    bomOptions,
    isBomOptionsPending,
    specOptions,
    moldOptions,
    isEdit,
    templateLabel
}: ProductBasicInfoProps) {
    const { locale, t } = useLanguage()
    const isChineseLocale = locale.startsWith('zh')
    const hierarchyMetaMap = useMemo(() => buildProductTypeHierarchyMetaMap(productTypes, true), [productTypes])
    const baseModelItems = useMemo(
        () => dynamicTypes.map((type: ProductType) => {
            const hierarchy = hierarchyMetaMap.get(type.id)
            const pathLabel = hierarchy?.pathLabel || type.name
            return {
                label: pathLabel,
                value: type.id
            }
        }),
        [dynamicTypes, hierarchyMetaMap]
    )
    const productStatusOptions = [
        { label: isChineseLocale ? '启用' : 'Active', value: 'Active' },
        { label: isChineseLocale ? '开发' : 'Draft', value: 'Draft' },
        { label: isChineseLocale ? '停用' : 'Archived', value: 'Archived' },
    ]
    return (
        <div className='p-2.5 rounded-[24px] bg-muted/5 border border-dashed border-muted transition-all hover:bg-muted/10'>
            <div className='grid grid-cols-1 sm:grid-cols-[104px_minmax(0,1fr)] items-stretch sm:items-start gap-3 sm:gap-4'>
                <FormField
                    control={form.control}
                    name='image'
                    render={({ field }) => (
                        <FormItem className='shrink-0 flex flex-col'>
                            <FormLabel className='text-slate-600 font-black text-[10px] uppercase tracking-widest ml-1'>{t('engineering.productMgmt.form.thumbnail')}</FormLabel>
                            <FormControl>
                                <div className='relative group flex justify-center sm:block'>
                                    <div className='size-[88px] sm:size-[104px] rounded-xl border-2 border-dashed border-muted/50 flex items-center justify-center bg-background overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50/50 shadow-inner'>
                                        {field.value ? (
                                            <>
                                                <img src={field.value} alt='Preview' className='size-full object-cover' />
                                                <button
                                                    type='button'
                                                    onClick={() => field.onChange('')}
                                                    className='absolute top-1 right-1 sm:top-1.5 sm:right-1.5 size-5 sm:size-6 bg-destructive rounded-full flex items-center justify-center text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:scale-110'
                                                >
                                                    <X className='size-3 sm:size-3.5' />
                                                </button>
                                            </>
                                        ) : (
                                            <label className='size-full flex flex-col items-center justify-center cursor-pointer'>
                                                <ImageIcon className='size-7 sm:size-8 text-muted-foreground/30 mb-1' />
                                                <span className='text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center px-2'>{t('engineering.productMgmt.form.uploadImg')}</span>
                                                <input
                                                    type='file'
                                                    className='hidden'
                                                    accept='image/*'
                                                    onChange={handleImageUpload}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </FormControl>
                        </FormItem>
                    )}
                />
                <div className='flex min-w-0 flex-col gap-2.5 sm:min-h-[104px]'>
                    <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-6'>
                        <FormField
                            control={form.control}
                            name='typeId'
                            render={({ field }) => (
                                <FormItem className='space-y-0.5 min-w-0'>
                                    <FormLabel className='text-slate-600 font-black text-[10px] uppercase tracking-widest ml-1 flex items-center gap-1'>
                                        <RequiredMark />
                                        <span>{t('engineering.categoryArchive.labels.baseModel')}</span>
                                    </FormLabel>
                                        <SelectDropdown
                                            value={field.value}
                                            onValueChange={(value) => {
                                                field.onChange(value)
                                                form.setValue('name', '', { shouldDirty: false, shouldValidate: false })
                                            }}
                                            isControlled={true}
                                            items={baseModelItems}
                                            placeholder={t('engineering.productMgmt.form.categoryPlaceholder')}
                                            className='h-[38px] w-full text-[11px] font-bold rounded-xl bg-muted/40 border-none px-3'
                                        />
                                    <FormMessage className='text-[10px] font-bold'>
                                        {t('engineering.productMgmt.form.categoryRequired')}
                                    </FormMessage>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='bomId'
                            render={({ field }) => (
                                <FormItem className='space-y-0.5 min-w-0'>
                                    <FormLabel className='text-slate-600 font-black text-[10px] uppercase tracking-widest ml-1'>{t('engineering.productMgmt.form.bom')}</FormLabel>
                                        <SelectDropdown
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            isControlled={true}
                                            isPending={isBomOptionsPending}
                                            items={bomOptions}
                                            placeholder={t('engineering.productMgmt.form.bomPlaceholder')}
                                            className='h-[38px] w-full text-[11px] font-bold rounded-xl bg-muted/40 border-none px-3'
                                        />
                                    <FormMessage className='text-[10px] font-bold' />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='modelCode'
                            render={({ field }) => (
                                <FormItem className='space-y-0.5 min-w-0'>
                                    <FormLabel className="text-blue-600 font-black text-[10px] uppercase tracking-widest flex items-center justify-between italic pr-1 ml-1">
                                        <span className='flex items-center gap-1'>
                                            <RequiredMark />
                                            <span>{t('engineering.productMgmt.form.modelCode')}</span>
                                        </span>
                                        <Badge variant='outline' className='text-[8px] h-3.5 px-0.5 border-blue-200 text-blue-500 bg-white'>{t('engineering.productMgmt.form.modelCodeLinked')}</Badge>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            className={`h-[38px] w-full text-[13px] font-mono font-black rounded-xl border-none bg-muted/40 px-3 ${isEdit ? 'opacity-50' : 'focus-visible:ring-blue-400 transition-all focus:bg-background'}`}
                                            {...field}
                                            value={field.value || '01'}
                                            placeholder={t('engineering.productMgmt.form.modelCodePlaceholder')}
                                            maxLength={2}
                                            readOnly={isEdit}
                                            onChange={(e) => {
                                                field.onChange(normalizeProductModelCodeValue(e.target.value))
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage className='text-[10px] font-bold' />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='engineeringSpecId'
                            render={({ field }) => (
                                <FormItem className='space-y-0.5 min-w-0'>
                                    <FormLabel className='text-slate-600 font-black text-[10px] uppercase tracking-widest ml-1'>{t('engineering.productMgmt.form.spec')}</FormLabel>
                                        <SelectDropdown
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            isControlled={true}
                                            items={specOptions}
                                            placeholder={t('engineering.productMgmt.form.specPlaceholder')}
                                            className='h-[38px] w-full text-[11px] font-bold rounded-xl bg-muted/40 border-none px-3'
                                        />
                                    <FormMessage className='text-[10px] font-bold' />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='moldGroup'
                            render={({ field }) => (
                                <FormItem className='space-y-0.5 min-w-0'>
                                    <FormLabel className='text-blue-800 font-black text-[10px] uppercase tracking-widest italic ml-1'>{t('engineering.productMgmt.form.mold')}</FormLabel>
                                        <SelectDropdown
                                            placeholder={t('engineering.productMgmt.form.moldPlaceholder')}
                                            items={moldOptions}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            isControlled={true}
                                            className='h-[38px] w-full text-[11px] font-bold rounded-xl bg-muted/40 border-none px-3'
                                        />
                                    <FormMessage className='text-[8px] font-bold uppercase' />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='status'
                            render={({ field }) => (
                                <FormItem className='space-y-0.5 min-w-0'>
                                    <FormLabel className='text-slate-600 font-black text-[10px] uppercase tracking-widest ml-1'>{t('engineering.productMgmt.form.status')}</FormLabel>
                                        <SelectDropdown
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            isControlled={true}
                                            items={productStatusOptions}
                                            className='h-[38px] w-full text-[11px] font-bold rounded-xl bg-muted/40 border-none px-3 text-slate-700'
                                        />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className='grid grid-cols-1 gap-2.5'>
                        <div className='space-y-0.5 min-w-0'>
                            <FormLabel className='text-blue-800 font-black text-[10px] uppercase tracking-widest italic ml-1'>{t('engineering.productMgmt.form.template')}</FormLabel>
                            <div className='flex h-[38px] w-full items-center rounded-xl bg-muted/40 px-3 text-[11px] font-bold text-slate-700'>
                                <span className='min-w-0 truncate'>
                                    {templateLabel || t('engineering.productMgmt.form.templatePlaceholder')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
