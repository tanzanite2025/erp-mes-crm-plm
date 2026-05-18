import { type Product, type ProductType } from '../data/schema'
import {
  deriveNormalizedProductSku,
  normalizeProductModelCodeValue,
  normalizeProductSkuValue,
  normalizeProductTemplateKeyValue,
} from './product-code-normalization'

interface BuildDefaultProductValuesOptions {
    includeVersion?: boolean
}

function normalizeTrimmedValue(value?: string | null): string {
    return value?.trim() ?? ''
}

export function buildDefaultProductValues(
    options: BuildDefaultProductValuesOptions = {}
): Product {
    const { includeVersion = true } = options

    return {
        id: '',
        sku: '',
        name: '',
        modelCode: normalizeProductModelCodeValue('01'),
        typeId: '',
        depth: undefined,
        widthInternal: undefined,
        widthExternal: undefined,
        maxTirePressure: undefined,
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
        bomId: '',
        attachments: [],
        version: includeVersion ? 1 : 1,
        templateKey: normalizeProductTemplateKeyValue(''),
    }
}

export function deriveSku(typeCode: string, modelCode: string): string {
    return deriveNormalizedProductSku(typeCode, modelCode)
}

export function isMirroredBaseModelName(params: {
    name?: string | null
    typeId?: string | null
    productTypes: ProductType[]
}): boolean {
    const normalizedName = normalizeTrimmedValue(params.name)
    const normalizedTypeId = normalizeTrimmedValue(params.typeId)

    if (!normalizedName || !normalizedTypeId) {
        return false
    }

    const selectedType = params.productTypes.find((type) => type.id === normalizedTypeId)
    if (!selectedType?.name) {
        return false
    }

    return normalizeTrimmedValue(selectedType.name) === normalizedName
}

export function resolveEffectiveProductName(params: {
    product: Pick<Product, 'name' | 'sku' | 'modelCode' | 'typeId'>
    productTypes: ProductType[]
    typeCode?: string
}): string {
    const normalizedName = normalizeTrimmedValue(params.product.name)
    if (normalizedName && !isMirroredBaseModelName({
        name: normalizedName,
        typeId: params.product.typeId,
        productTypes: params.productTypes,
    })) {
        return normalizedName
    }

    const normalizedSku = normalizeProductSkuValue(params.product.sku)
    if (normalizedSku) {
        return normalizedSku
    }

    const resolvedTypeCode = normalizeTrimmedValue(params.typeCode)
        || normalizeTrimmedValue(params.productTypes.find((type) => type.id === params.product.typeId)?.code)

    if (resolvedTypeCode) {
        return deriveNormalizedProductSku(
            resolvedTypeCode,
            normalizeProductModelCodeValue(params.product.modelCode || '01')
        )
    }

    return normalizeTrimmedValue(params.product.typeId)
        ? normalizeProductModelCodeValue(params.product.modelCode || '01')
        : ''
}
