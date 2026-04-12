import { type ChangeOrder, type Product, type ProductProcessRouting, type ProductTemplate } from '../data/schema'
import {
    type ChangeOrderDraftOverrides,
    type ProductDraftOverrides,
    type ProductRoutingDraftOverrides,
    type ProductTemplateDraftOverrides,
} from '../mutation-types'
import {
    normalizeChangeOrderEntity,
    normalizeEngineeringChangeOrderNo,
    normalizeEngineeringRevisionNo,
    normalizeEngineeringRoutingVersionControlTag,
    normalizeEngineeringSiteCode,
    normalizeProductRoutingEntity,
    normalizeProductTemplateEntity,
} from './product-code-normalization'

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
        createdAt: new Date().toISOString(),
        version: 1,
        ...overrides,
    })
}

export function createChangeOrderDraft(overrides: ChangeOrderDraftOverrides = {}): ChangeOrder {
    return normalizeChangeOrderEntity({
        id: '',
        title: '',
        productId: '',
        status: 'draft',
        description: '',
        createdAt: '',
        version: 1,
        changeOrderNo: '',
        changeType: 'ECO',
        siteCode: '',
        revisionNo: 'R1',
        isDefaultSite: true,
        effectiveFrom: '',
        effectiveTo: '',
        ...overrides,
    })
}

const formatDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '')

export function buildChangeOrderDraft(overrides?: ChangeOrderDraftOverrides | null): ChangeOrder {
    const siteCode = normalizeEngineeringSiteCode(overrides?.siteCode)

    return normalizeChangeOrderEntity(createChangeOrderDraft({
        ...overrides,
        changeOrderNo: normalizeEngineeringChangeOrderNo(overrides?.changeOrderNo),
        title: overrides?.title || '',
        productId: overrides?.productId || '',
        status: overrides?.status || 'draft',
        description: overrides?.description || '',
        siteCode,
        revisionNo: normalizeEngineeringRevisionNo(overrides?.revisionNo),
        isDefaultSite: overrides?.isDefaultSite ?? !siteCode,
        effectiveFrom: formatDateInput(overrides?.effectiveFrom),
        effectiveTo: formatDateInput(overrides?.effectiveTo),
        createdAt: overrides?.createdAt || '',
        version: overrides?.version ?? 1,
    }))
}

export function createProductRoutingDraft(overrides: ProductRoutingDraftOverrides = {}): ProductProcessRouting {
    return normalizeProductRoutingEntity({
        targetProductId: '',
        versionControlTag: normalizeEngineeringRoutingVersionControlTag('V1.0.0.Draft'),
        isCurrentlyActiveBlueprint: true,
        version: 1,
        routeNodes: [],
        ...overrides,
    })
}
