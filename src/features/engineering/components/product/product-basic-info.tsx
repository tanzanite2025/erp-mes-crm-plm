'use client'

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SelectDropdown } from '@/components/select-dropdown'
import { Badge } from '@/components/ui/badge'
import type { UseFormReturn } from 'react-hook-form'
import { getLocalizedSpecComponents } from '../specs'
import { type Product, type ProductType } from '../../data/schema'

import { ImageIcon, X } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

interface ProductBasicInfoProps {
    form: UseFormReturn<Product>
    dynamicTypes: ProductType[]
    productTypes: ProductType[]
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
    specOptions: { label: string; value: string }[]
    moldOptions: { label: string; value: string }[]
    isEdit: boolean
}

export function ProductBasicInfo({ form, dynamicTypes, productTypes, handleImageUpload, specOptions, moldOptions, isEdit }: ProductBasicInfoProps) {
    const { t } = useLanguage()
    const specComponents = getLocalizedSpecComponents(t)
    return (
        <div className='p-3.5 rounded-[32px] bg-muted/5 border border-dashed border-muted transition-all hover:bg-muted/10'>
            {/* 第一层：核心选择区 (移动端纵向堆叠) */}
            <div className='flex flex-col sm:flex-row items-stretch sm:items-start gap-4 sm:gap-6'>
                <FormField
                    control={form.control}
                    name='image'
                    render={({ field }) => (
                        <FormItem className='shrink-0 flex flex-col'>
                            <FormLabel className='text-slate-600 font-black text-[10px] uppercase tracking-widest ml-1'>{t('engineering.productMgmt.form.thumbnail')}</FormLabel>
                             <FormControl>
                                <div className='relative group flex justify-center sm:block'>
                                    <div className='size-[100px] sm:size-[124px] rounded-[24px] border-2 border-dashed border-muted/50 flex items-center justify-center bg-background overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50/50 shadow-inner'>
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
                                                <ImageIcon className='size-8 sm:size-10 text-muted-foreground/30 mb-1.5 sm:mb-2' />
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
                <div className='flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5'>
                    <FormField
                        control={form.control}
                        name='typeId'
                        render={({ field }) => (
                            <FormItem className='space-y-0.5'>
                                <FormLabel className='text-slate-600 font-black text-[10px] uppercase tracking-widest ml-1'>{t('engineering.productMgmt.form.category')}</FormLabel>
                                <FormControl>
                                    <SelectDropdown
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        isControlled={true}
                                        items={dynamicTypes.map((t: ProductType) => {
                                            const parent = productTypes.find(p => p.id === t.parentId)
                                            return {
                                                label: parent ? `├ ${t.name}` : `📁 ${t.name}`,
                                                value: t.id
                                            }
                                        })}
                                        placeholder={t('engineering.productMgmt.form.categoryPlaceholder')}
                                        className='h-[42px] w-full text-[11px] font-bold rounded-2xl bg-muted/40 border-none px-4'
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name='modelCode'
                        render={({ field }) => (
                            <FormItem className='space-y-0.5'>
                                <FormLabel className="text-blue-600 font-black text-[10px] uppercase tracking-widest flex items-center justify-between italic pr-1 ml-1">
                                    {t('engineering.productMgmt.form.modelCode')}
                                    <Badge variant='outline' className='text-[8px] h-3.5 px-0.5 border-blue-200 text-blue-500 bg-white'>{t('engineering.productMgmt.form.modelCodeLinked')}</Badge>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        className={`h-[42px] w-full text-[13px] font-mono font-black rounded-2xl border-none bg-muted/40 px-4 ${isEdit ? 'opacity-50' : 'focus-visible:ring-blue-400 transition-all focus:bg-background'}`}
                                        {...field}
                                        placeholder={t('engineering.productMgmt.form.modelCodePlaceholder')}
                                        maxLength={2}
                                        readOnly={isEdit}
                                        onChange={(e) => {
                                            const next = e.target.value.replace(/\D/g, '').slice(0, 2)
                                            field.onChange(next)
                                        }}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name='templateKey'
                        render={({ field }) => (
                            <FormItem className='space-y-0.5'>
                                <FormLabel className='text-blue-800 font-black text-[10px] uppercase tracking-widest italic ml-1'>{t('engineering.productMgmt.form.template')}</FormLabel>
                                <FormControl>
                                    <SelectDropdown
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        isControlled={true}
                                        items={Object.keys(specComponents).map(key => ({
                                            label: specComponents[key as keyof typeof specComponents].label,
                                            value: key
                                        }))}
                                        placeholder={t('engineering.productMgmt.form.templatePlaceholder')}
                                        className='h-[42px] w-full text-[11px] font-bold rounded-2xl bg-muted/40 border-none px-4'
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name='status'
                        render={({ field }) => (
                            <FormItem className='space-y-0.5'>
                                <FormLabel className='text-slate-600 font-black text-[10px] uppercase tracking-widest ml-1'>{t('engineering.productMgmt.form.status')}</FormLabel>
                                <FormControl>
                                    <SelectDropdown
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        isControlled={true}
                                        items={[
                                            { label: t('engineering.dict.Active'), value: 'Active' },
                                            { label: t('engineering.dict.Archived'), value: 'Archived' },
                                            { label: t('engineering.dict.Draft'), value: 'Draft' },
                                        ]}
                                        className='h-[42px] w-full text-[11px] font-bold rounded-2xl bg-muted/40 border-none px-4'
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            {/* 第二层：详细参数区 (通栏布局) */}
            <div className='pt-3.5 mt-3.5 border-t border-dashed border-muted/30 space-y-3'>
                <FormField
                    control={form.control}
                    name='name'
                    render={({ field }) => (
                        <FormItem className='space-y-0.5'>
                            <FormLabel className='text-blue-800 font-black text-[10px] uppercase tracking-widest italic ml-1'>{t('engineering.productMgmt.form.prodName')}</FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder={t('engineering.productMgmt.form.prodNamePlaceholder')} 
                                    className='h-[42px] text-[13px] font-black italic rounded-xl bg-muted/40 border-none focus-visible:ring-blue-400 transition-all px-4 shadow-sm' 
                                    {...field} 
                                />
                            </FormControl>
                            <FormMessage className='text-[10px] font-bold uppercase' />
                        </FormItem>
                    )}
                />
                
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-2.5'>
                    <FormField
                        control={form.control}
                        name='sku'
                        render={({ field }) => (
                            <FormItem className='space-y-0.5'>
                                <FormLabel className='text-muted-foreground/40 font-black text-[10px] uppercase tracking-widest ml-1'>
                                    <span>{t('engineering.productMgmt.form.sku')}</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        className='h-[42px] w-full text-[11px] bg-muted/20 border-none text-slate-400 cursor-not-allowed rounded-2xl font-mono px-4'
                                        {...field}
                                        readOnly
                                        tabIndex={-1}
                                        placeholder={t('engineering.productMgmt.form.skuPlaceholder')}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name='engineeringSpecId'
                        render={({ field }) => (
                            <FormItem className='space-y-0.5'>
                                <FormLabel className='text-slate-600 font-black text-[10px] uppercase tracking-widest ml-1'>{t('engineering.productMgmt.form.spec')}</FormLabel>
                                <FormControl>
                                    <SelectDropdown
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        items={specOptions}
                                        placeholder={t('engineering.productMgmt.form.specPlaceholder')}
                                        className='h-[42px] w-full text-[11px] font-bold rounded-2xl bg-muted/40 border-none px-4'
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name='moldGroup'
                        render={({ field }) => (
                            <FormItem className='space-y-0.5'>
                                <FormLabel className='text-blue-800 font-black text-[10px] uppercase tracking-widest italic ml-1'>{t('engineering.productMgmt.form.mold')}</FormLabel>
                                <SelectDropdown
                                    placeholder={t('engineering.productMgmt.form.moldPlaceholder')}
                                    items={moldOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    isControlled={true}
                                    className='h-[42px] w-full text-[11px] font-bold rounded-2xl bg-muted/40 border-none px-4'
                                />
                                <FormMessage className='text-[8px] font-bold uppercase' />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name='description'
                        render={({ field }) => (
                            <FormItem className='space-y-0.5'>
                                <FormLabel className='text-slate-500 font-black text-[10px] uppercase tracking-widest ml-1'>{t('engineering.productMgmt.form.memo')}</FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder={t('engineering.productMgmt.form.memoPlaceholder')} 
                                        className='h-[42px] w-full text-[11px] rounded-2xl bg-muted/40 border-none px-4' 
                                        {...field} 
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
            </div>
        </div>
    )
}
