'use client'

import { createElement, type ReactNode } from 'react'

import { GenericSpecOverview } from './generic-spec'
import { RimSpecForm, RimSpecOverview } from './rim-spec'
import { StemSpecForm, StemSpecOverview } from './stem-spec'
import { ForkSpecForm, ForkSpecOverview } from './fork-spec'
import { type Product, type ProductTemplate, type ProductType } from '../../data/schema'
import { productTemplateService } from '../../services/product-template-service'

type TranslationFn<T extends string = string> = (
  key: T,
  params?: Record<string, string | number>
) => string

type TemplateBoundType = {
  id?: string
  parentId?: string | null
  templateId?: string | null
}

interface ProductEditTemplateParams {
  productTypes: ProductType[]
  typeId?: string | null
  productTemplateKey?: string | null
}

export interface ProductEditTemplateResolution {
  template: ProductTemplate | null
  source: 'typeBinding' | 'productTemplateKey' | 'none'
}

export const SPEC_COMPONENTS = {
  RIM: {
    label: 'Rim Spec',
    form: RimSpecForm,
    overview: RimSpecOverview,
  },
  STEM: {
    label: 'Stem Spec',
    form: StemSpecForm,
    overview: StemSpecOverview,
  },
  FORK: {
    label: 'Fork Spec',
    form: ForkSpecForm,
    overview: ForkSpecOverview,
  },
} as const

export type SpecType = keyof typeof SPEC_COMPONENTS

export interface ProductSpecOverviewProps {
  product: Product
  categoryName?: string
}

export function renderProductSpecOverview({
  product,
  categoryName,
  templateKey,
}: ProductSpecOverviewProps & {
  templateKey?: string | null
}): ReactNode {
  const normalizedTemplateKey = templateKey?.trim().toUpperCase()
  if (!normalizedTemplateKey) {
    return createElement(GenericSpecOverview, { product, categoryName })
  }

  switch (normalizedTemplateKey as SpecType) {
    case 'RIM':
      return createElement(RimSpecOverview, { product })
    case 'STEM':
      return createElement(StemSpecOverview, { product })
    case 'FORK':
      return createElement(ForkSpecOverview, { product })
    default:
      return createElement(GenericSpecOverview, { product, categoryName })
  }
}

export function getLocalizedSpecComponents<T extends string>(t: TranslationFn<T>): Record<
  SpecType,
  {
    label: string
    form: (typeof SPEC_COMPONENTS)[SpecType]['form']
    overview: (typeof SPEC_COMPONENTS)[SpecType]['overview']
  }
> {
  return {
    RIM: {
      ...SPEC_COMPONENTS.RIM,
      label: t('engineering.specForms.labels.rim' as T),
    },
    STEM: {
      ...SPEC_COMPONENTS.STEM,
      label: t('engineering.specForms.labels.stem' as T),
    },
    FORK: {
      ...SPEC_COMPONENTS.FORK,
      label: t('engineering.specForms.labels.fork' as T),
    },
  }
}

export function resolveTemplateFromType(
  templates: ProductTemplate[],
  type?: TemplateBoundType
): ProductTemplate | null {
  if (!type?.templateId) return null
  return templates.find((template) => template.id === type.templateId) || null
}

function resolveTemplateFromTypeChain(types: ProductType[], typeId?: string | null): TemplateBoundType | null {
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

function resolveTemplateFromProductTemplateKey(
  templates: ProductTemplate[],
  productTemplateKey?: string | null
): ProductTemplate | null {
  const normalizedTemplateKey = productTemplateKey?.trim().toUpperCase()
  if (!normalizedTemplateKey) return null

  const matches = templates.filter(
    (template) => template.componentKey.trim().toUpperCase() === normalizedTemplateKey
  )

  if (matches.length === 1) {
    return matches[0]
  }

  const activeMatch = matches.find((template) => template.active)
  return activeMatch || null
}

export function resolveEffectiveTemplate(
  templates: ProductTemplate[],
  params: ProductEditTemplateParams
): ProductEditTemplateResolution {
  const resolvedType = resolveTemplateFromTypeChain(params.productTypes, params.typeId)
  const templateFromType = resolveTemplateFromType(templates, resolvedType ?? undefined)
  if (templateFromType) {
    return {
      template: templateFromType,
      source: 'typeBinding',
    }
  }

  const templateFromProductTemplateKey = resolveTemplateFromProductTemplateKey(
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

export async function getEffectiveTemplate(params: ProductEditTemplateParams) {
  const templates = await productTemplateService.getTemplates()
  return resolveEffectiveTemplate(templates, params)
}
