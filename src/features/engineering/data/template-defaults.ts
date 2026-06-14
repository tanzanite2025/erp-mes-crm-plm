import { type ProductTemplate } from './schema'

type TranslationFn<T extends string = string> = (
  key: T,
  params?: Record<string, string | number>
) => string

export const DEFAULT_PRODUCT_TEMPLATES: ReadonlyArray<ProductTemplate> = [
  {
    id: '787d558d-71b5-4a5d-a602-990a986f1e2c',
    name: 'Rim Physical Spec Template',
    code: 'RIM_STD',
    componentKey: 'RIM',
    description: 'Standard geometry template for rim products.',
    active: true,
    createdAt: new Date(0).toISOString(),
    attributeBindings: [],
    version: 1,
  },
  {
    id: '8e88e89f-8671-460c-8f4b-09257e8cc49a',
    name: 'Stem Physical Spec Template',
    code: 'STEM_STD',
    componentKey: 'STEM',
    description: 'Physical spec template for stems and related components.',
    active: true,
    createdAt: new Date(0).toISOString(),
    attributeBindings: [],
    version: 1,
  },
  {
    id: 'c2c1a8d0-6f9a-4c28-98e7-789a695e1234',
    name: 'Fork Physical Spec Template',
    code: 'FORK_STD',
    componentKey: 'FORK',
    description: 'Parameter definition template for composite forks.',
    active: true,
    createdAt: new Date(0).toISOString(),
    attributeBindings: [],
    version: 1,
  },
]

export function localizeTemplateDefinition<T extends string>(
  template: ProductTemplate,
  t: TranslationFn<T>
): ProductTemplate {
  switch (template.code) {
    case 'RIM_STD':
      return {
        ...template,
        name: t('engineering.templateMgmt.presets.RIM_STD.name' as T),
        description: t(
          'engineering.templateMgmt.presets.RIM_STD.description' as T
        ),
      }
    case 'STEM_STD':
      return {
        ...template,
        name: t('engineering.templateMgmt.presets.STEM_STD.name' as T),
        description: t(
          'engineering.templateMgmt.presets.STEM_STD.description' as T
        ),
      }
    case 'FORK_STD':
      return {
        ...template,
        name: t('engineering.templateMgmt.presets.FORK_STD.name' as T),
        description: t(
          'engineering.templateMgmt.presets.FORK_STD.description' as T
        ),
      }
    default:
      return template
  }
}

export function localizeTemplateDefinitions<T extends string>(
  templates: ProductTemplate[],
  t: TranslationFn<T>
): ProductTemplate[] {
  return templates.map((template) => localizeTemplateDefinition(template, t))
}
