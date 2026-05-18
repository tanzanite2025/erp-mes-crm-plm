import { type Product, type ProductType } from '../data/schema'
import {
  deriveNormalizedProductSku,
  normalizeProductModelCodeValue,
  normalizeProductTemplateKeyValue,
} from './product-code-normalization'

interface BuildDefaultProductValuesOptions {
    includeVersion?: boolean
}

function normalizeTrimmedValue(value?: string | null): string {
    return value?.trim() ?? ''
}

function resolveSelectedProductType(params: {
    product: Pick<Product, 'typeId'>
    productTypes: ProductType[]
}): ProductType | undefined {
    const normalizedTypeId = normalizeTrimmedValue(params.product.typeId)
    if (!normalizedTypeId) {
        return undefined
    }

    return params.productTypes.find((type) => type.id === normalizedTypeId)
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

export function resolveBaseModelName(params: {
    product: Pick<Product, 'typeId'>
    productTypes: ProductType[]
}): string {
    return normalizeTrimmedValue(resolveSelectedProductType(params)?.name)
}

export function resolveEffectiveProductName(params: {
    product: Pick<Product, 'typeId'>
    productTypes: ProductType[]
}): string {
    return resolveBaseModelName({
        product: params.product,
        productTypes: params.productTypes,
    })
}

export function resolveEffectiveProductSku(params: {
    product: Pick<Product, 'modelCode' | 'typeId'>
    productTypes: ProductType[]
    typeCode?: string
}): string {
    const resolvedTypeCode = normalizeTrimmedValue(params.typeCode)
        || normalizeTrimmedValue(resolveSelectedProductType({
            product: params.product,
            productTypes: params.productTypes,
        })?.code)

    if (!resolvedTypeCode || !normalizeTrimmedValue(params.product.typeId)) {
        return ''
    }

    return deriveNormalizedProductSku(
        resolvedTypeCode,
        normalizeProductModelCodeValue(params.product.modelCode || '01')
    )
}
