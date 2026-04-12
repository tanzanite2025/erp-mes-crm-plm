import { type Product } from '../data/schema'
import { normalizeModelCode, normalizeSku } from '@/lib/codecs/code-normalization'
import { PRODUCT_ATTRIBUTE_CATEGORY_KEYS, upsertAttributeValue } from './product-attribute-utils'

export interface ProductVariantSelection {
    level: string
    weight: number | undefined
}

export type SkuValidationResult =
    | { ok: true }
    | { ok: false; reason: 'EMPTY' | 'DUPLICATE_IN_BATCH' | 'DUPLICATE_EXISTING'; sku?: string }

interface BuildDefaultProductValuesOptions {
    includeVersion?: boolean
}

export function buildDefaultProductValues(
    options: BuildDefaultProductValuesOptions = {}
): Product {
    const { includeVersion = true } = options

    return {
        id: '',
        sku: '',
        name: '',
        modelCode: '01',
        typeId: '',
        depth: undefined,
        widthInternal: undefined,
        widthExternal: undefined,
        weight: undefined,
        image: '',
        restrictions: [],
        moldGroup: '',
        description: '',
        status: 'Active',
        attributeValues: [],
        createdAt: new Date().toISOString(),
        length: undefined,
        angle: undefined,
        clamp: '',
        offset: undefined,
        axleCrown: undefined,
        steerer: '',
        engineeringSpecId: '',
        attachments: [],
        version: includeVersion ? 1 : 1,
    }
}

export function deriveSku(typeCode: string, modelCode: string, versionLevel?: string): string {
    const normalizedTypeCode = normalizeSku(typeCode)
    const normalizedModelCode = normalizeModelCode(modelCode)
    const normalizedVersionLevel = normalizeSku(versionLevel)
    if (versionLevel) {
        return normalizeSku(`${normalizedTypeCode}-${normalizedModelCode}-${normalizedVersionLevel}`)
    }
    return normalizeSku(`${normalizedTypeCode}-${normalizedModelCode}`)
}

export function ensureSkuUnique(
    productsToSave: Product[],
    existingSkus: Set<string>
): SkuValidationResult {
    const seen = new Set<string>()
    for (const product of productsToSave) {
        const sku = normalizeSku(product.sku)
        if (!sku) {
            return { ok: false, reason: 'EMPTY' }
        }
        if (seen.has(sku)) {
            return { ok: false, reason: 'DUPLICATE_IN_BATCH', sku }
        }
        if (existingSkus.has(sku)) {
            return { ok: false, reason: 'DUPLICATE_EXISTING', sku }
        }
        seen.add(sku)
    }
    return { ok: true }
}

export function buildBatchProducts(
    values: Product,
    selectedVariants: ProductVariantSelection[],
    _typeCode: string
): Product[] {
    return selectedVariants.map(variant => {
        const nextValues = upsertAttributeValue(values, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version, variant.level)
        return {
            ...nextValues,
            id: '',
            weight: variant.weight,
            createdAt: new Date().toISOString()
        }
    })
}

export function buildSingleVariantProduct(
    values: Product,
    variant: ProductVariantSelection,
    _typeCode: string
): Product {
    const nextValues = upsertAttributeValue(values, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version, variant.level)
    return {
        ...nextValues,
        weight: variant.weight,
    }
}
