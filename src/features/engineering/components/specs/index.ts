'use client'

import { RimSpecForm, RimSpecOverview } from './rim-spec'
import { StemSpecForm, StemSpecOverview } from './stem-spec'
import { ForkSpecForm, ForkSpecOverview } from './fork-spec'
import { type ProductTemplate } from '../../data/schema'
import { productTemplateService } from '../../services/product-template-service'

type TranslationFn<T extends string = string> = (
  key: T,
  params?: Record<string, string | number>
) => string

type TemplateBoundType = {
  templateId?: string | null
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

export async function getEffectiveTemplate(type?: TemplateBoundType) {
  const templates = await productTemplateService.getTemplates()
  return resolveTemplateFromType(templates, type)
}
