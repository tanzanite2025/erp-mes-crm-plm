'use client'

import { createElement, type ReactNode } from 'react'
import { type Product } from '../../data/schema'
import { productTemplateService } from '../../services/product-template-service'
import {
  resolveEffectiveTemplate,
  type ProductEffectiveTemplateParams,
  type ProductTemplateResolution,
} from '../../utils/product-template-resolution'
import { ForkSpecForm, ForkSpecOverview } from './fork-spec'
import { GenericSpecOverview } from './generic-spec'
import { RimSpecForm, RimSpecOverview } from './rim-spec'
import { StemSpecForm, StemSpecOverview } from './stem-spec'

type TranslationFn<T extends string = string> = (
  key: T,
  params?: Record<string, string | number>
) => string

export type ProductEditTemplateParams = ProductEffectiveTemplateParams
export type ProductEditTemplateResolution = ProductTemplateResolution

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

export function getLocalizedSpecComponents<T extends string>(
  t: TranslationFn<T>
): Record<
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

export async function getEffectiveTemplate(params: ProductEditTemplateParams) {
  const templates = await productTemplateService.getTemplates()
  return resolveEffectiveTemplate(templates, params)
}
