import {
  type Product,
  type ProductTemplate,
  type ProductType,
} from '../data/schema'

type TemplateBoundType = Pick<ProductType, 'id' | 'parentId' | 'templateId'>

export interface ProductEffectiveTemplateParams {
  productTypes: ProductType[]
  typeId?: string | null
  productTemplateKey?: string | null
}

export interface ProductAuthoritativeTemplateParams extends ProductEffectiveTemplateParams {
  resolvedTemplateId?: string | null
  resolvedTemplateKey?: string | null
}

export interface ProductTemplateResolution {
  template: ProductTemplate | null
  source:
    | 'resolvedTemplateId'
    | 'resolvedTemplateKey'
    | 'typeBinding'
    | 'productTemplateKey'
    | 'none'
}

function normalizeTemplateIdentity(value?: string | null): string {
  return value?.trim() ?? ''
}

function normalizeTemplateComponentKey(value?: string | null): string {
  return normalizeTemplateIdentity(value).toUpperCase()
}

export function resolveTemplateFromType(
  templates: ProductTemplate[],
  type?: TemplateBoundType | null
): ProductTemplate | null {
  const templateId = normalizeTemplateIdentity(type?.templateId)
  if (!templateId) return null
  return templates.find((template) => template.id === templateId) || null
}

export function resolveTemplateFromTypeChain(
  types: ProductType[],
  typeId?: string | null
): TemplateBoundType | null {
  const currentTypeId = normalizeTemplateIdentity(typeId)
  if (!currentTypeId) return null

  const typeMap = new Map(types.map((type) => [type.id, type]))
  const visited = new Set<string>()
  let cursor: string | undefined = currentTypeId

  while (cursor) {
    if (visited.has(cursor)) return null
    visited.add(cursor)

    const currentType = typeMap.get(cursor)
    if (!currentType) return null
    if (normalizeTemplateIdentity(currentType.templateId)) {
      return currentType
    }

    cursor = normalizeTemplateIdentity(currentType.parentId) || undefined
  }

  return typeMap.get(currentTypeId) || null
}

export function resolveTemplateFromComponentKey(
  templates: ProductTemplate[],
  componentKey?: string | null
): ProductTemplate | null {
  const normalizedComponentKey = normalizeTemplateComponentKey(componentKey)
  if (!normalizedComponentKey) return null

  const matches = templates.filter(
    (template) =>
      normalizeTemplateComponentKey(template.componentKey) ===
      normalizedComponentKey
  )

  if (matches.length === 1) {
    return matches[0]
  }

  return null
}

export function resolveEffectiveTemplate(
  templates: ProductTemplate[],
  params: ProductEffectiveTemplateParams
): ProductTemplateResolution {
  const resolvedType = resolveTemplateFromTypeChain(
    params.productTypes,
    params.typeId
  )
  const templateFromType = resolveTemplateFromType(templates, resolvedType)
  if (normalizeTemplateIdentity(resolvedType?.templateId)) {
    return {
      template: templateFromType,
      source: templateFromType ? 'typeBinding' : 'none',
    }
  }

  const templateFromProductTemplateKey = resolveTemplateFromComponentKey(
    templates,
    params.productTemplateKey
  )
  if (templateFromProductTemplateKey) {
    return {
      template: templateFromProductTemplateKey,
      source: 'productTemplateKey',
    }
  }

  return {
    template: null,
    source: 'none',
  }
}

export function resolveAuthoritativeTemplate(
  templates: ProductTemplate[],
  params: ProductAuthoritativeTemplateParams
): ProductTemplateResolution {
  const resolvedTemplateId = normalizeTemplateIdentity(
    params.resolvedTemplateId
  )
  if (resolvedTemplateId) {
    const templateFromResolvedId = templates.find(
      (template) => template.id === resolvedTemplateId
    )
    return {
      template: templateFromResolvedId ?? null,
      source: templateFromResolvedId ? 'resolvedTemplateId' : 'none',
    }
  }

  const boundType = resolveTemplateFromTypeChain(
    params.productTypes,
    params.typeId
  )
  if (normalizeTemplateIdentity(boundType?.templateId)) {
    return resolveEffectiveTemplate(templates, params)
  }

  const templateFromResolvedKey = resolveTemplateFromComponentKey(
    templates,
    params.resolvedTemplateKey
  )
  if (templateFromResolvedKey) {
    return {
      template: templateFromResolvedKey,
      source: 'resolvedTemplateKey',
    }
  }

  return resolveEffectiveTemplate(templates, params)
}

export function resolveAuthoritativeTemplateForProduct(
  templates: ProductTemplate[],
  product: Pick<
    Product,
    'typeId' | 'templateKey' | 'resolvedTemplateId' | 'resolvedTemplateKey'
  >,
  productTypes: ProductType[]
): ProductTemplateResolution {
  return resolveAuthoritativeTemplate(templates, {
    productTypes,
    typeId: product.typeId,
    productTemplateKey: product.templateKey,
    resolvedTemplateId: product.resolvedTemplateId,
    resolvedTemplateKey: product.resolvedTemplateKey,
  })
}
