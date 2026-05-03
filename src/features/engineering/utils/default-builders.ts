import { type Product, type ProductTemplate } from '../data/schema'
import {
    type ProductDraftOverrides,
    type ProductTemplateDraftOverrides,
} from '../mutation-types'
import { normalizeProductTemplateEntity } from './product-code-normalization'

export function createProductDraft(overrides: ProductDraftOverrides = {}): Product {
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
        version: 1,
        ...overrides,
    }
}

export function createProductTemplateDraft(overrides: ProductTemplateDraftOverrides = {}): ProductTemplate {
    return normalizeProductTemplateEntity({
        id: '',
        name: '',
        code: '',
        componentKey: 'GENERAL',
        description: '',
        active: true,
        attributeBindings: [],
        createdAt: new Date().toISOString(),
        version: 1,
        ...overrides,
    })
}
