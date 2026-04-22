import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
    Database,
    ShieldCheck,
    ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DMPreview } from '../components/dm-preview'
import { type AppearanceMapping } from '../data/appearance-mapping'
import { type ProductType, type Product } from '@/features/engineering/data/schema'
import { useLanguage } from '@/context/language-provider'

interface DMSimulationSectionProps {
    mockInputs: {
        year: string
        month: string
        model: string
        appearance: string
        category: string
        holes: string
        serial: string
        isDrainHole: boolean
        wheelType: string
        scopeCode: string
    }
    setMockInputs: React.Dispatch<React.SetStateAction<{
        year: string
        month: string
        model: string
        appearance: string
        category: string
        holes: string
        serial: string
        isDrainHole: boolean
        wheelType: string
        scopeCode: string
    }>>
    assembledCode: string
    scanText: string
    parsedResult: any
    products: Product[]
    appearanceMapping: AppearanceMapping | null
    productTypes: ProductType[]
    previewType: 'datamatrix' | 'qrcode' | 'code128'
    monthOptions: { label: string, value: string }[]
    onRequestNextSerial: (modelCode: string) => void
    currentServerCount: number
    previewOutputLabel?: string
}

export function DMSimulationSection({
    mockInputs,
    setMockInputs,
    assembledCode,
    scanText,
    parsedResult,
    products,
    appearanceMapping,
    productTypes,
    previewType,
    monthOptions,
    onRequestNextSerial,
    currentServerCount,
    previewOutputLabel = 'QR Code Output',
}: DMSimulationSectionProps) {
    const { t } = useLanguage()
    const selectableCategories = useMemo(() => {
        return productTypes
            .filter((type) => type.active && type.parentId && type.code)
            .map((type) => ({
                id: type.id,
                name: type.name,
                code: type.code!.substring(0, 1).toUpperCase(),
            }))
    }, [productTypes])

    const filteredProducts = useMemo(() => {
        if (!mockInputs.category || mockInputs.category === '*') return products

        const targetTypeIds = selectableCategories
            .filter((category) => category.code === mockInputs.category)
            .map((category) => category.id)

        return products.filter((product) => targetTypeIds.includes(product.typeId))
    }, [mockInputs.category, products, selectableCategories])

    React.useEffect(() => {
        if (mockInputs.model !== '**' && mockInputs.category !== '*') {
            const currentProduct = products.find((product) => product.modelCode === mockInputs.model)
            if (currentProduct) {
                const type = productTypes.find((item) => item.id === currentProduct.typeId)
                const currentTypeCode = type?.code?.substring(0, 1).toUpperCase() || '*'
                if (currentTypeCode !== mockInputs.category) {
                    setMockInputs((prev: any) => ({ ...prev, model: '**' }))
                }
            }
        }
    }, [mockInputs.category, mockInputs.model, productTypes, products, setMockInputs])

    const availableHoles = useMemo(() => {
        if (!products || !Array.isArray(products) || !mockInputs.model || mockInputs.model === '**') {
            return [16, 18, 20, 21, 24, 28, 32, 36]
        }
        return [16, 18, 20, 21, 24, 28, 32, 36]
    }, [mockInputs.model, products])

    React.useEffect(() => {
        if (!availableHoles.includes(parseInt(mockInputs.holes))) {
            const defaultHole = availableHoles[0]?.toString().padStart(2, '0') || '24'
            setMockInputs((prev) => ({ ...prev, holes: defaultHole }))
        }
    }, [availableHoles, mockInputs.holes, setMockInputs])

    return (
        <div className={cn(
            'rounded-4xl border p-4 md:p-8 lg:p-10 shadow-2xl relative overflow-hidden group transition-all duration-500',
            'bg-white border-slate-200 shadow-slate-200/50',
            'dark:bg-slate-950 dark:border-white/5 dark:shadow-none',
        )}>
            <div className='absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_70%_30%,var(--tw-gradient-stops))] from-blue-500/30 via-transparent to-transparent dark:opacity-20' />

            <div className='relative z-10 space-y-10'>
                <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6'>
                    <div className='space-y-1.5 min-w-0 flex-1 w-full'>
                        <div className='text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-blue-600/60 dark:text-blue-400/60'>
                            <ShieldCheck className='size-3.5' /> {t('basicSettings.dmNumbering.simulation.title' as any)} <span>{previewOutputLabel}</span>
                        </div>
                        <h3 className='text-lg lg:text-2xl font-black tracking-tight leading-tight whitespace-normal wrap-break-word text-slate-900 dark:text-white'>
                            {parsedResult?.display?.fullDescription || t('basicSettings.dmNumbering.simulation.placeholder' as any)}
                        </h3>
                        <p className='text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] italic'>{t('basicSettings.dmNumbering.simulation.subtitle' as any)}</p>
                    </div>
                    <div className='flex flex-col items-start sm:items-end gap-3 shrink-0 w-full sm:w-auto p-4 rounded-2xl bg-blue-500/5 sm:bg-transparent border border-blue-500/10 sm:border-none'>
                        <div className='flex items-center gap-2 w-full justify-between sm:justify-end'>
                            <span className='text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest'>{t('basicSettings.dmNumbering.simulation.codeLabel' as any)}:</span>
                            <Badge
                                variant='outline'
                                className={cn(
                                    'h-8 px-4 rounded-lg border-2 font-mono text-sm tracking-widest font-black transition-colors',
                                    assembledCode.includes('*')
                                        ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                                        : 'bg-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400/80',
                                )}
                            >
                                {assembledCode}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
                    <div className={cn(
                        'lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-5 p-6 rounded-3xl transition-colors',
                        'bg-slate-50 border-slate-200',
                        'dark:bg-white/2 dark:border-white/5',
                    )}>
                        <div className='space-y-2'>
                            <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1'>{t('basicSettings.dmNumbering.simulation.form.year' as any)}</label>
                            <Select value={mockInputs.year} onValueChange={(value) => setMockInputs((prev: any) => ({ ...prev, year: value }))}>
                                <SelectTrigger className='w-full bg-background/50 border-input rounded-xl h-11! py-0! font-bold focus:ring-blue-500/20'>
                                    <SelectValue placeholder='YEAR_SELECT' />
                                </SelectTrigger>
                                <SelectContent className='bg-popover border-input'>
                                    <SelectItem value='25'>2025 (25)</SelectItem>
                                    <SelectItem value='26'>2026 (26)</SelectItem>
                                    <SelectItem value='27'>2027 (27)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className='space-y-2'>
                            <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1'>{t('basicSettings.dmNumbering.simulation.form.month' as any)}</label>
                            <Select value={mockInputs.month} onValueChange={(value) => setMockInputs((prev: any) => ({ ...prev, month: value }))}>
                                <SelectTrigger className='w-full bg-background/50 border-input rounded-xl h-11! py-0! font-bold focus:ring-blue-500/20'>
                                    <SelectValue placeholder='MONTH_SELECT' />
                                </SelectTrigger>
                                <SelectContent className='bg-popover border-input'>
                                    {monthOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className='space-y-2'>
                            <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1'>{t('basicSettings.dmNumbering.simulation.form.category' as any)}</label>
                            <Select value={mockInputs.category} onValueChange={(value) => setMockInputs((prev: any) => ({ ...prev, category: value }))}>
                                <SelectTrigger className='w-full bg-blue-500/5 border-blue-500/20 rounded-xl h-11! py-0! font-bold focus:ring-blue-500/20 text-blue-600 dark:text-blue-400'>
                                    <SelectValue placeholder='CAT_SELECT' />
                                </SelectTrigger>
                                <SelectContent className='bg-popover border-input'>
                                    <SelectItem value='*'>ANY (*)</SelectItem>
                                    {selectableCategories.map((category) => (
                                        <SelectItem key={category.id} value={category.code}>
                                            {category.code} - {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className='space-y-2'>
                            <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1'>{t('basicSettings.dmNumbering.simulation.form.model' as any)}</label>
                            <Select value={mockInputs.model} onValueChange={(value) => setMockInputs((prev: any) => ({ ...prev, model: value }))}>
                                <SelectTrigger className='w-full bg-background/50 border-input rounded-xl h-11! py-0! font-bold focus:ring-blue-500/20'>
                                    <SelectValue placeholder='MODEL_SELECT' />
                                </SelectTrigger>
                                <SelectContent className='bg-popover border-input'>
                                    <SelectItem value='**'>ANY (**)</SelectItem>
                                    {Array.isArray(filteredProducts) && filteredProducts.map((product: any) => (
                                        <SelectItem key={product.id} value={product.modelCode}>
                                            {product.modelCode} - {product.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className='space-y-2'>
                            <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1'>{t('basicSettings.dmNumbering.simulation.form.appearance' as any)}</label>
                            <Select value={mockInputs.appearance} onValueChange={(value) => setMockInputs((prev: any) => ({ ...prev, appearance: value }))}>
                                <SelectTrigger className='w-full bg-background/50 border-input rounded-xl h-11! py-0! font-bold focus:ring-blue-500/20'>
                                    <SelectValue placeholder='APP_SELECT' />
                                </SelectTrigger>
                                <SelectContent className='bg-popover border-input'>
                                    {appearanceMapping && Object.entries(appearanceMapping).map(([key, value]) => (
                                        <SelectItem key={key} value={key}>
                                            {key} - {value.label || 'UNDEFINED'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className='space-y-2'>
                            <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1'>{t('basicSettings.dmNumbering.simulation.form.holes' as any)}</label>
                            <Select value={mockInputs.holes} onValueChange={(value) => setMockInputs((prev: any) => ({ ...prev, holes: value }))}>
                                <SelectTrigger className='w-full bg-background/50 border-input rounded-xl h-11! py-0! font-bold focus:ring-blue-500/20'>
                                    <SelectValue placeholder='HOLE_SELECT' />
                                </SelectTrigger>
                                <SelectContent className='bg-popover border-input'>
                                    {availableHoles.map((holes: number) => (
                                        <SelectItem key={holes} value={holes.toString().padStart(2, '0')}>{holes}H</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className='space-y-2 col-span-1 sm:col-span-2 md:col-span-1'>
                            <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1 flex justify-between items-center'>
                                <span>{t('basicSettings.dmNumbering.simulation.form.serial' as any)}</span>
                                <span className='text-teal-600 dark:text-teal-500/60 font-mono'>{t('basicSettings.dmNumbering.simulation.form.serialCount' as any, { count: currentServerCount })}</span>
                            </label>
                            <div className='flex gap-2'>
                                <div className={cn(
                                    'flex-1 border rounded-xl h-11 flex items-center px-4 font-mono font-black tracking-widest shadow-inner transition-colors',
                                    'bg-white border-slate-200 text-blue-600',
                                    'dark:bg-white/3 dark:border-white/10 dark:text-blue-400',
                                )}>
                                    {mockInputs.serial || t('basicSettings.dmNumbering.simulation.form.notIssued' as any)}
                                </div>
                                <Button
                                    type='button'
                                    variant='secondary'
                                    className='h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-600/20'
                                    onClick={() => onRequestNextSerial(mockInputs.model)}
                                >
                                    {t('basicSettings.dmNumbering.simulation.form.applySerial' as any)}
                                </Button>
                            </div>
                        </div>

                        <div className='col-span-1 sm:col-span-2 md:col-span-3 pt-6 mt-2 border-t border-slate-200 dark:border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6'>
                            <div className='space-y-3'>
                                <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1 flex items-center gap-2'>
                                    <ShieldCheck className='size-3 text-blue-600 dark:text-blue-400' /> {t('basicSettings.dmNumbering.simulation.form.specialPrefix' as any)}
                                </label>
                                <div className={cn(
                                    'flex items-center gap-3 p-2.5 rounded-xl border h-11! transition-colors',
                                    'bg-white border-slate-200',
                                    'dark:bg-white/2 dark:border-white/10',
                                )}>
                                    <span className='text-[10px] font-bold text-muted-foreground uppercase'>{t('basicSettings.dmNumbering.simulation.form.enableHPrefix' as any)}</span>
                                    <div
                                        onClick={() => setMockInputs((prev) => ({ ...prev, isDrainHole: !prev.isDrainHole }))}
                                        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300 ${mockInputs.isDrainHole ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                                    >
                                        <div className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-all duration-300 ${mockInputs.isDrainHole ? 'left-7' : 'left-1'}`} />
                                    </div>
                                </div>
                            </div>

                            <div className='space-y-3'>
                                <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1 flex items-center gap-2'>
                                    <ChevronRight className='size-3 text-blue-600 dark:text-blue-400' /> {t('basicSettings.dmNumbering.simulation.form.suffixWheel' as any)}
                                </label>
                                <div className={cn(
                                    'flex p-1 border rounded-xl h-11! items-center transition-colors',
                                    'bg-white border-slate-200',
                                    'dark:bg-white/2 dark:border-white/10',
                                )}>
                                    {[
                                        { label: t('basicSettings.dmNumbering.simulation.form.wheelOptions.F' as any), value: 'F' },
                                        { label: t('basicSettings.dmNumbering.simulation.form.wheelOptions.R' as any), value: 'R' },
                                        { label: t('basicSettings.dmNumbering.simulation.form.wheelOptions.H' as any), value: 'H' },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setMockInputs((prev) => ({ ...prev, wheelType: option.value }))}
                                            className={cn(
                                                'flex-1 h-full px-1 text-[9px] font-black rounded-lg transition-all',
                                                mockInputs.wheelType === option.value
                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
                                            )}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className='space-y-3'>
                                <label className='text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest ml-1 flex items-center gap-2'>
                                    <Database className='size-3 text-blue-600 dark:text-blue-400' /> {t('basicSettings.dmNumbering.simulation.form.suffixScope' as any)}
                                </label>
                                <Input
                                    className='h-11! border-slate-200 dark:bg-white/2 dark:border-white/10 rounded-xl font-black text-blue-600 dark:text-blue-400 placeholder:text-slate-300 dark:placeholder:text-slate-700 focus-visible:ring-blue-500/20'
                                    placeholder={t('basicSettings.dmNumbering.simulation.form.scopePlaceholder' as any)}
                                    value={mockInputs.scopeCode}
                                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                        setMockInputs((prev) => ({ ...prev, scopeCode: event.target.value.toUpperCase() }))
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className='lg:col-span-4 flex flex-col items-center justify-center space-y-8'>
                        <div className='relative group/dm'>
                            <DMPreview
                                code={parsedResult?.display?.scannableText || scanText}
                                shortCode={assembledCode}
                                type={previewType}
                                isDrainHole={mockInputs.isDrainHole}
                                wheelType={mockInputs.wheelType}
                                scopeCode={mockInputs.scopeCode}
                            />
                            <div className='absolute -inset-6 bg-blue-500/20 blur-3xl opacity-30 group-hover/dm:opacity-60 transition-opacity pointer-events-none' />
                            <div className='absolute top-0 left-0 w-full h-1 bg-blue-400/40 blur-md animate-[scanMove_4s_infinite] pointer-events-none' />
                        </div>

                        <div className='w-full space-y-4'>
                            <div className={cn(
                                'p-5 rounded-2xl border space-y-3 transition-colors',
                                'bg-slate-50 border-slate-200',
                                'dark:bg-white/4 dark:border-white/10',
                            )}>
                                <div className='flex items-center gap-2 mb-2'>
                                    <ShieldCheck className='size-3.5 text-blue-600 dark:text-blue-400' />
                                    <span className='text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest'>{t('basicSettings.dmNumbering.simulation.validator.title' as any)} {t('basicSettings.dmNumbering.simulation.validator.titleSuffix' as any)}</span>
                                </div>
                                <div className='text-sm font-black text-slate-900 dark:text-white/90 leading-relaxed'>
                                    {parsedResult?.display?.fullDescription || t('basicSettings.dmNumbering.simulation.validator.waiting' as any)}
                                </div>
                                <div className='flex gap-1 items-center text-[10px] text-muted-foreground/60 font-medium'>
                                    <ChevronRight className='size-3' />
                                    {t('basicSettings.dmNumbering.simulation.validator.success' as any)}
                                </div>
                            </div>

                            <div className='p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 space-y-2'>
                                <h5 className='text-[10px] font-black text-orange-600 dark:text-orange-400/80 uppercase tracking-widest flex items-center gap-1.5'>
                                    <Database className='size-3' /> {t('basicSettings.dmNumbering.simulation.scannerGuide.title' as any)}
                                </h5>
                                <p className='text-[9px] leading-relaxed text-orange-800/40 dark:text-orange-200/40 font-medium italic'>
                                    {t('basicSettings.dmNumbering.simulation.scannerGuide.text' as any)} <code className='bg-orange-100 dark:bg-white/5 px-1 rounded text-orange-700 dark:text-orange-300'>{assembledCode}</code>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
