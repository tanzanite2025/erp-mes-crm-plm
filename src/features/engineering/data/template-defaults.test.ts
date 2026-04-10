import { describe, expect, it } from 'vitest'
import { localizeTemplateDefinitions } from './template-defaults'
import { type ProductTemplate } from './schema'

const templates: ProductTemplate[] = [
  {
    id: 'rim-template',
    name: 'Rim Physical Spec Template',
    code: 'RIM_STD',
    componentKey: 'RIM',
    description: 'Standard geometry template for rim products.',
    active: true,
    createdAt: '2026-01-28T00:00:00.000Z',
    version: 1,
  },
  {
    id: 'custom-template',
    name: 'Custom Template',
    code: 'CUSTOM',
    componentKey: 'GENERAL',
    description: 'Custom template stays untouched.',
    active: true,
    createdAt: '2026-01-28T00:00:00.000Z',
    version: 1,
  },
]

describe('localizeTemplateDefinitions', () => {
  it('replaces preset labels by code and leaves custom templates untouched', () => {
    const localized = localizeTemplateDefinitions(templates, (key) => {
      const dictionary: Record<string, string> = {
        'engineering.templateMgmt.presets.RIM_STD.name': '车圈物理规格模板',
        'engineering.templateMgmt.presets.RIM_STD.description': '适用于车圈类产品的标准几何参数模板。',
      }

      return dictionary[key] ?? key
    })

    expect(localized[0]).toMatchObject({
      code: 'RIM_STD',
      name: '车圈物理规格模板',
      description: '适用于车圈类产品的标准几何参数模板。',
    })
    expect(localized[1]).toEqual(templates[1])
  })
})
