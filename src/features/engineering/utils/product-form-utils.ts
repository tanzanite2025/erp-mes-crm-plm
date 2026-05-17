import { type Product } from '../data/schema'
import {
  deriveNormalizedProductSku,
  normalizeProductModelCodeValue,
  normalizeProductTemplateKeyValue,
} from './product-code-normalization'

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
        attachments: [],
        version: includeVersion ? 1 : 1,
        templateKey: normalizeProductTemplateKeyValue(''),
    }
}

export function deriveSku(typeCode: string, modelCode: string): string {
    return deriveNormalizedProductSku(typeCode, modelCode)
}
