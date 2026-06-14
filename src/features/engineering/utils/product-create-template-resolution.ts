import { type ProductTemplate, type ProductType } from '../data/schema'
import { productTemplateService } from '../services/product-template-service'

interface ProductCreateTemplateParams {
  productTypes: ProductType[]
  typeId?: string | null
}

export interface ProductCreateTemplateResolution {
  template: ProductTemplate | null
  source: 'typeBinding' | 'none'
}

type TemplateBoundType = {
  id?: string
  parentId?: string | null
  templateId?: string | null
}

function resolveTemplateFromType(
  templates: ProductTemplate[],
  type?: TemplateBoundType
): ProductTemplate | null {
  if (!type?.templateId) return null
  return templates.find((template) => template.id === type.templateId) || null
}

function resolveTemplateFromTypeChain(
  types: ProductType[],
  typeId?: string | null
): TemplateBoundType | null {
  const currentTypeId = typeId?.trim()
  if (!currentTypeId) return null

  const typeMap = new Map(types.map((type) => [type.id, type]))
  const visited = new Set<string>()
  let cursor: string | undefined = currentTypeId

  while (cursor) {
    if (visited.has(cursor)) return null
    visited.add(cursor)

    const currentType = typeMap.get(cursor)
    if (!currentType) return null
    if (currentType.templateId?.trim()) return currentType

    cursor = currentType.parentId?.trim() || undefined
  }

  return typeMap.get(currentTypeId) || null
}

export function resolveCreateProductTemplate(
  templates: ProductTemplate[],
  params: ProductCreateTemplateParams
): ProductCreateTemplateResolution {
  const resolvedType = resolveTemplateFromTypeChain(
    params.productTypes,
    params.typeId
  )
  const templateFromType = resolveTemplateFromType(
    templates,
    resolvedType ?? undefined
  )
  if (templateFromType) {
    return {
      template: templateFromType,
      source: 'typeBinding',
    }
  }

  return {
    template: null,
    source: 'none',
  }
}

export async function getCreateProductTemplate(
  params: ProductCreateTemplateParams
) {
  const templates = await productTemplateService.getTemplates()
  return resolveCreateProductTemplate(templates, params)
}
