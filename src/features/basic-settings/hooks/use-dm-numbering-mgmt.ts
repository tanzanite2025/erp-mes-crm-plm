import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { canOpenRouteEntryNonBlocking } from '@/features/authz/guards/route-entry-access'
import { DM_RULES_CONFIG, type DMRuleSegment } from '../data/dm-rules-config'
import { parseDMCode } from '../utils/dm-parser'
import { toBase36 } from '../utils/dm-utils'
import { ProductTypeService } from '@/features/engineering/services/product-type-service'
import { type ProductType } from '@/features/engineering/data/schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { PRODUCT_TYPES_QUERY_KEY } from '@/features/engineering/query-keys'
import type { TranslationKey } from '@/locales'
import { useAppearanceMapping } from './use-appearance-mapping'

export function useDMNumberingMgmt() {
    const { t } = useLanguage()
    const navigate = useNavigate()
    const user = useAuthStore((state) => state.user)
    
    // Authz guards
    const canOpenEngineeringTypes = canOpenRouteEntryNonBlocking(user, '/engineering/types')
    const canOpenEngineeringProducts = canOpenRouteEntryNonBlocking(user, '/engineering/products')

    // Core states
    const [rules, setRules] = useState<DMRuleSegment[]>(DM_RULES_CONFIG)
    const [selectedSegment, setSelectedSegment] = useState<DMRuleSegment | null>(null)
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
    const [isAppearanceDialogOpen, setIsAppearanceDialogOpen] = useState(false)

    const { data: products = [] } = useGetProducts()
    const { data: appearanceMapping = null } = useAppearanceMapping()
    const { data: productTypes = [] } = useQuery<ProductType[]>({
        queryKey: PRODUCT_TYPES_QUERY_KEY,
        queryFn: () => ProductTypeService.getProductTypes(),
    })
    
    // Simulation states
    const [mockInputs, setMockInputs] = useState({
        year: '25',
        month: 'N',
        model: '**',
        appearance: '1',
        category: '*',
        holes: '24',
        serial: '00023',
        isDrainHole: false,
        wheelType: 'H',
        scopeCode: ''
    })
    const [mockServerSerials, setMockServerSerials] = useState<Record<string, number>>({})

    // Reset workflow states
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
    const [confirmText, setConfirmText] = useState('')

    // Constants & Dictionaries
    const dmParserLabelKeys = useMemo(() => ({
        yearSuffix: 'basicSettings.dmNumbering.parser.labels.yearSuffix' as TranslationKey,
        monthSuffix: 'basicSettings.dmNumbering.parser.labels.monthSuffix' as TranslationKey,
        categorySuffix: 'basicSettings.dmNumbering.parser.labels.categorySuffix' as TranslationKey,
        appearancePrefix: 'basicSettings.dmNumbering.parser.labels.appearancePrefix' as TranslationKey,
        holesSuffix: 'basicSettings.dmNumbering.parser.labels.holesSuffix' as TranslationKey,
        serialPrefix: 'basicSettings.dmNumbering.parser.labels.serialPrefix' as TranslationKey,
        base36Suffix: 'basicSettings.dmNumbering.parser.labels.base36Suffix' as TranslationKey,
        anyCat: 'basicSettings.dmNumbering.parser.labels.anyCat' as TranslationKey,
        anyModel: 'basicSettings.dmNumbering.parser.labels.anyModel' as TranslationKey,
        unknownMonth: 'basicSettings.dmNumbering.parser.labels.unknownMonth' as TranslationKey,
        invalidCode: 'basicSettings.dmNumbering.parser.labels.invalidCode' as TranslationKey,
        errorLength: 'basicSettings.dmNumbering.parser.labels.errorLength' as TranslationKey,
        months: {
            '1': 'basicSettings.dmNumbering.parser.labels.months.1' as TranslationKey,
            '2': 'basicSettings.dmNumbering.parser.labels.months.2' as TranslationKey,
            '3': 'basicSettings.dmNumbering.parser.labels.months.3' as TranslationKey,
            '4': 'basicSettings.dmNumbering.parser.labels.months.4' as TranslationKey,
            '5': 'basicSettings.dmNumbering.parser.labels.months.5' as TranslationKey,
            '6': 'basicSettings.dmNumbering.parser.labels.months.6' as TranslationKey,
            '7': 'basicSettings.dmNumbering.parser.labels.months.7' as TranslationKey,
            '8': 'basicSettings.dmNumbering.parser.labels.months.8' as TranslationKey,
            '9': 'basicSettings.dmNumbering.parser.labels.months.9' as TranslationKey,
            '0': 'basicSettings.dmNumbering.parser.labels.months.0' as TranslationKey,
            N: 'basicSettings.dmNumbering.parser.labels.months.N' as TranslationKey,
            D: 'basicSettings.dmNumbering.parser.labels.months.D' as TranslationKey,
        },
    }), [])

    const monthOptions = useMemo(() => [
        { label: `1${t('common.units.month' as TranslationKey)}`, value: '1' }, 
        { label: `2${t('common.units.month' as TranslationKey)}`, value: '2' }, 
        { label: `3${t('common.units.month' as TranslationKey)}`, value: '3' },
        { label: `4${t('common.units.month' as TranslationKey)}`, value: '4' }, 
        { label: `5${t('common.units.month' as TranslationKey)}`, value: '5' }, 
        { label: `6${t('common.units.month' as TranslationKey)}`, value: '6' },
        { label: `7${t('common.units.month' as TranslationKey)}`, value: '7' }, 
        { label: `8${t('common.units.month' as TranslationKey)}`, value: '8' }, 
        { label: `9${t('common.units.month' as TranslationKey)}`, value: '9' },
        { label: `10${t('common.units.month' as TranslationKey)} (0)`, value: '0' }, 
        { label: `11${t('common.units.month' as TranslationKey)} (N)`, value: 'N' }, 
        { label: `12${t('common.units.month' as TranslationKey)} (D)`, value: 'D' },
    ], [t])

    // Helper: Model to Category synchronization
    const getModelCategoryCode = useCallback((modelCode: string) => {
        if (!modelCode || modelCode === '**' || !products.length) return '*'
        const product = products.find(p => p.modelCode === modelCode)
        if (!product || !product.typeId) return '*'
        const type = productTypes.find(t => t.id === product.typeId)
        if (!type || !type.code) return '*'
        return type.code.substring(0, 1).toUpperCase()
    }, [products, productTypes])

    useEffect(() => {
        if (mockInputs.model !== '**') {
            const autoCode = getModelCategoryCode(mockInputs.model)
            if (autoCode !== '*' && mockInputs.category === '*') {
                setMockInputs(prev => ({ ...prev, category: autoCode }))
            }
        }
    }, [mockInputs.model, getModelCategoryCode, mockInputs.category])

    // Business Logic: Serial generation
    const requestNextSerial = useCallback((modelCode: string) => {
        if (!modelCode || modelCode === '**') {
            toast.error(t('basicSettings.dmNumbering.simulation.form.modelRequired' as TranslationKey))
            return
        }
        setMockServerSerials(prev => {
            const current = prev[modelCode] || 0
            const next = current + 1
            const base36Serial = toBase36(next, 5)
            setMockInputs(inputs => ({ ...inputs, serial: base36Serial }))
            toast.success(t('basicSettings.dmNumbering.simulation.form.serialSuccess' as TranslationKey, { model: modelCode, serial: base36Serial }))
            return { ...prev, [modelCode]: next }
        })
    }, [t])

    // Final calculations
    const assembledCode = useMemo(() => {
        const { year, month, model, appearance, category, holes, serial } = mockInputs
        return (
            year.padStart(2, '0') +
            month +
            (model && model !== '**' ? model.padStart(2, '0') : '**') +
            appearance.substring(0, 1) +
            category.substring(0, 1) +
            holes.padStart(2, '0') +
            serial.toUpperCase().padStart(5, '0')
        ).toUpperCase().substring(0, 14)
    }, [mockInputs])

    const parserLabels = useMemo(() => ({
        yearSuffix: t(dmParserLabelKeys.yearSuffix),
        monthSuffix: t(dmParserLabelKeys.monthSuffix),
        categorySuffix: t(dmParserLabelKeys.categorySuffix),
        appearancePrefix: t(dmParserLabelKeys.appearancePrefix),
        holesSuffix: t(dmParserLabelKeys.holesSuffix),
        serialPrefix: t(dmParserLabelKeys.serialPrefix),
        base36Suffix: t(dmParserLabelKeys.base36Suffix),
        anyCat: t(dmParserLabelKeys.anyCat),
        anyModel: t(dmParserLabelKeys.anyModel),
        unknownMonth: t(dmParserLabelKeys.unknownMonth),
        invalidCode: t(dmParserLabelKeys.invalidCode),
        errorLength: t(dmParserLabelKeys.errorLength),
        months: {
            '1': t(dmParserLabelKeys.months['1']),
            '2': t(dmParserLabelKeys.months['2']),
            '3': t(dmParserLabelKeys.months['3']),
            '4': t(dmParserLabelKeys.months['4']),
            '5': t(dmParserLabelKeys.months['5']),
            '6': t(dmParserLabelKeys.months['6']),
            '7': t(dmParserLabelKeys.months['7']),
            '8': t(dmParserLabelKeys.months['8']),
            '9': t(dmParserLabelKeys.months['9']),
            '0': t(dmParserLabelKeys.months['0']),
            'N': t(dmParserLabelKeys.months.N),
            'D': t(dmParserLabelKeys.months.D),
        }
    }), [dmParserLabelKeys, t])

    const parsedResult = useMemo(() => parseDMCode(assembledCode, {
        appearanceMapping: appearanceMapping || undefined,
        productTypes,
        products,
        labels: parserLabels
    }), [assembledCode, appearanceMapping, productTypes, products, parserLabels])

    // UI Action Handlers
    const handleEditLogic = (segment: DMRuleSegment) => {
        if (segment.id === 'appearance') {
            setIsAppearanceDialogOpen(true)
        } else if (segment.id === 'category' && canOpenEngineeringTypes) {
            navigate({ to: '/engineering/types' })
        } else if (segment.id === 'holes' && canOpenEngineeringProducts) {
            navigate({ to: '/engineering/products' })
        } else {
            setSelectedSegment(segment)
            setIsConfigDialogOpen(true)
        }
    }

    const handleSaveRule = (segmentId: string, newData: any) => {
        setRules(prev => prev.map(s => {
            if (s.id === segmentId) {
                if (Array.isArray(newData)) {
                    return { ...s, examples: newData.map((m: any) => `${m.key}=${m.value}`) }
                }
                if (typeof newData === 'string') {
                    return { ...s, description: newData }
                }
            }
            return s
        }))
    }

    const handleResetRules = () => {
        if (confirmText === t('basicSettings.dmNumbering.resetDialog.verifyTarget')) {
            setRules(DM_RULES_CONFIG)
            setIsResetDialogOpen(false)
            setConfirmText('')
            toast.success(t('basicSettings.dmNumbering.toasts.resetSuccess'))
        }
    }

    return {
        // Core Data
        rules,
        appearanceMapping,
        productTypes,
        products,
        
        // Simulation
        mockInputs,
        setMockInputs,
        assembledCode,
        parsedResult,
        monthOptions,
        requestNextSerial,
        mockServerSerials,

        // Dialogs
        isConfigDialogOpen,
        setIsConfigDialogOpen,
        selectedSegment,
        isAppearanceDialogOpen,
        setIsAppearanceDialogOpen,
        isResetDialogOpen,
        setIsResetDialogOpen,
        confirmText,
        setConfirmText,

        // Handlers
        handleEditLogic,
        handleSaveRule,
        handleResetRules
    }
}
