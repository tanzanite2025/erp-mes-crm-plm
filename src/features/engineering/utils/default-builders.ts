import { type ChangeOrder, type Product, type ProductProcessRouting, type ProductTemplate } from '../data/schema'
import {
    type ChangeOrderDraftOverrides,
    type ProductDraftOverrides,
    type ProductRoutingDraftOverrides,
    type ProductTemplateDraftOverrides,
} from '../mutation-types'

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
    return {
        id: '',
        name: '',
        code: '',
        componentKey: 'GENERAL',
        description: '',
        active: true,
        createdAt: new Date().toISOString(),
        version: 1,
        ...overrides,
    }
}

export function createChangeOrderDraft(overrides: ChangeOrderDraftOverrides = {}): ChangeOrder {
    return {
        id: '',
        title: '',
        productId: '',
        status: 'draft',
        description: '',
        createdAt: new Date().toISOString(),
        version: 1,
        changeOrderNo: '',
        changeType: 'ECO',
        siteCode: '',
        revisionNo: 'R1',
        isDefaultSite: true,
        effectiveFrom: '',
        effectiveTo: '',
        ...overrides,
    }
}

export function createProductRoutingDraft(overrides: ProductRoutingDraftOverrides = {}): ProductProcessRouting {
    return {
        targetProductId: '',
        versionControlTag: 'V1.0.0.Draft',
        isCurrentlyActiveBlueprint: true,
        version: 1,
        routeNodes: [],
        ...overrides,
    }
}
