import { type Dispatch, type SetStateAction, useEffect } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { useState } from 'react'
import { type Product, type ProductType } from '../data/schema'
import { AssetService } from '@/features/equipment-tooling/services/asset-service'
import { engineeringDBService } from '@/features/engineering-db/services/engineering-db-service'
import { getEffectiveTemplate } from '../components/specs'
import { dictionaryService } from '@/features/basic-settings/services/dictionary-service'
import { buildDefaultProductValues, type ProductVariantSelection } from '../utils/product-form-utils'

type OptionItem = { label: string; value: string }

interface UseProductFormInitParams {
    open: boolean
    isEdit: boolean
    currentRow?: Product
    productTypes: ProductType[]
    form: UseFormReturn<Product>
    selectedVariants: ProductVariantSelection[]
    setSelectedVariants: Dispatch<SetStateAction<ProductVariantSelection[]>>
}

export function useProductFormInit({
    open,
    isEdit,
    currentRow,
    productTypes,
    form,
    selectedVariants,
    setSelectedVariants
}: UseProductFormInitParams) {
    const [tireTypeOptions, setTireTypeOptions] = useState<OptionItem[]>([])
    const [brakeTypeOptions, setBrakeTypeOptions] = useState<OptionItem[]>([])
    const [techSeriesOptions, setTechSeriesOptions] = useState<OptionItem[]>([])
    const [versionLevelOptions, setVersionLevelOptions] = useState<OptionItem[]>([])
    const [moldOptions, setMoldOptions] = useState<OptionItem[]>([])
    const [specOptions, setSpecOptions] = useState<OptionItem[]>([])

    useEffect(() => {
        const loadDictData = async () => {
            if (!open) return
            await dictionaryService.init()

            const getDict = (code: string) => {
                return dictionaryService.getOptions(code)
            }

            setTireTypeOptions(getDict('TIRE_TYPE'))
            setBrakeTypeOptions(getDict('BRAKE_TYPE'))
            setTechSeriesOptions(getDict('TECH_SERIES'))
            setVersionLevelOptions(getDict('VERSION_LEVEL'))

            const groups = await AssetService.getGroupNames()
            setMoldOptions(groups.map(group => ({ label: group, value: group })))

            const specs = await engineeringDBService.getSpecs()
            setSpecOptions(specs.map(spec => ({ label: `${spec.name} (${spec.version})`, value: spec.id })))

            const weights = getDict('VERSION_LEVEL')
            if (!isEdit && selectedVariants.length === 0 && weights.length > 0) {
                const currentWeight = form.getValues('weight')
                setSelectedVariants([{ level: weights[0].value, weight: currentWeight }])
            }
        }

        loadDictData()
    }, [open, isEdit, form])

    useEffect(() => {
        const initForm = async () => {
            if (open && isEdit && currentRow) {
                const draftRow: Product & { techSpecId?: string } = { ...currentRow }
                if (!draftRow.engineeringSpecId && draftRow.techSpecId) {
                    draftRow.engineeringSpecId = draftRow.techSpecId
                }
                if (!draftRow.templateKey) {
                    const type = productTypes.find(t => t.id === draftRow.typeId)
                    if (type) {
                        const template = await getEffectiveTemplate(type)
                        if (template) draftRow.templateKey = template.componentKey
                    }
                }
                form.reset(draftRow)
                if (draftRow.versionLevel) {
                    setSelectedVariants([{ level: draftRow.versionLevel, weight: draftRow.weight || 0 }])
                }
            } else if (open) {
                form.reset(buildDefaultProductValues({ includeVersion: false }))
            }
        }
        initForm()
    }, [open, isEdit, currentRow, productTypes, form])

    useEffect(() => {
        if (!open) {
            setSelectedVariants([])
        }
    }, [open])

    return {
        tireTypeOptions,
        brakeTypeOptions,
        techSeriesOptions,
        versionLevelOptions,
        moldOptions,
        specOptions
    }
}
