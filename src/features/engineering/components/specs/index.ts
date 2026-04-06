'use client'

import { RimSpecForm, RimSpecOverview } from './rim-spec'
import { StemSpecForm, StemSpecOverview } from './stem-spec'
import { ForkSpecForm, ForkSpecOverview } from './fork-spec'
import { productTemplateService } from '../../services/product-template-service'

type TranslationFn<T extends string = string> = (
  key: T,
  params?: Record<string, string | number>
) => string

export const INITIAL_TEMPLATES = [
  {
    id: '787d558d-71b5-4a5d-a602-990a986f1e2c',
    name: 'Rim Physical Spec Template',
    code: 'RIM_STD',
    componentKey: 'RIM',
    description: 'Standard geometry template for rim products.',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '8e88e89f-8671-460c-8f4b-09257e8cc49a',
    name: 'Stem Physical Spec Template',
    code: 'STEM_STD',
    componentKey: 'STEM',
    description: 'Physical spec template for stems and related components.',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c2c1a8d0-6f9a-4c28-98e7-789a695e1234',
    name: 'Fork Physical Spec Template',
    code: 'FORK_STD',
    componentKey: 'FORK',
    description: 'Parameter definition template for composite forks.',
    active: true,
    createdAt: new Date().toISOString(),
  },
] as const

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

export async function getEffectiveTemplate(type?: { templateId?: string | null; name?: string | null }) {
  const templates = (await productTemplateService.getTemplates()) || INITIAL_TEMPLATES

  if (type?.templateId) {
    const found = templates.find((template) => template.id === type.templateId)
    if (found) return found
  }

  const typeName = type?.name?.toLowerCase() || ''

  if (typeName.includes('圈') || typeName.includes('rim')) {
    return templates.find((template) => template.componentKey === 'RIM') || INITIAL_TEMPLATES[0]
  }

  if (typeName.includes('把立') || typeName.includes('stem')) {
    return templates.find((template) => template.componentKey === 'STEM') || INITIAL_TEMPLATES[1]
  }

  if (typeName.includes('前叉') || typeName.includes('fork')) {
    return templates.find((template) => template.componentKey === 'FORK') || INITIAL_TEMPLATES[2]
  }

  return null
}
