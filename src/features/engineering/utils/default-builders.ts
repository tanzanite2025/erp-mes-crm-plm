import { type ChangeOrder, type Product, type ProductProcessRouting, type ProductTemplate } from '../data/schema'

export function createProductDraft(overrides: Partial<Product> = {}): Partial<Product> {
    return {
        id: '',
        sku: '',
        name: '',
        modelCode: '01',
        typeId: '',
        depth: undefined,
        widthInternal: undefined,
        widthExternal: undefined,
        tireType: undefined,
        weight: undefined,
        brakeType: '',
        techSeries: '',
        versionLevel: '',
        image: '',
        restrictions: [],
        moldGroup: '',
        description: '',
        status: 'Active',
        templateKey: '',
        createdAt: new Date().toISOString(),
        length: undefined,
        angle: undefined,
        clamp: '',
        offset: undefined,
        axleCrown: undefined,
        steerer: '',
        engineeringSpecId: '',
        version: 1,
        ...overrides,
    }
}

export function createProductTemplateDraft(overrides: Partial<ProductTemplate> = {}): ProductTemplate {
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

export function createChangeOrderDraft(overrides: Partial<ChangeOrder> = {}): ChangeOrder {
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

export function createProductRoutingDraft(overrides: Partial<ProductProcessRouting> = {}): ProductProcessRouting {
    return {
        targetProductId: '',
        versionControlTag: 'V1.0.0.Draft',
        isCurrentlyActiveBlueprint: true,
        version: 1,
        routeNodes: [],
        ...overrides,
    }
}
