export interface ProductAppearance {
  id: string
  name: string
  barcodeCode: string
  description: string
  imageUrl: string
  imageThumbnailUrl: string
  imageName: string
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  version: number
}

export interface ProductAppearanceDraft {
  id?: string
  name: string
  barcodeCode: string
  description: string
  imageUrl: string
  imageThumbnailUrl: string
  imageName: string
  active: boolean
  sortOrder: number
  version?: number
}

export interface LegacyAppearanceMapping {
  [key: string]: {
    label: string
    desc: string
  }
}

export const PRODUCT_APPEARANCES_STORAGE_KEY = 'engineering_product_appearances'
export const LEGACY_APPEARANCE_MAPPING_STORAGE_KEY = 'xdfc_appearance_mapping'

function createSeedAppearance(
  id: string,
  name: string,
  barcodeCode: string,
  description: string,
  sortOrder: number
): ProductAppearance {
  const now = new Date().toISOString()

  return {
    id,
    name,
    barcodeCode,
    description,
    imageUrl: '',
    imageThumbnailUrl: '',
    imageName: '',
    active: true,
    sortOrder,
    createdAt: now,
    updatedAt: now,
    version: 1,
  }
}

export const DEFAULT_PRODUCT_APPEARANCES: ProductAppearance[] = [
  createSeedAppearance('appearance_ud', 'UD', '1', 'Default appearance 1', 10),
  createSeedAppearance('appearance_3k', '3K', '2', 'Default appearance 2', 20),
  createSeedAppearance(
    'appearance_12k',
    '12K',
    '3',
    'Default appearance 3',
    30
  ),
  createSeedAppearance(
    'appearance_marble',
    'MARBLE',
    '4',
    'Default appearance 4',
    40
  ),
  createSeedAppearance(
    'appearance_paint',
    'PAINT',
    '5',
    'Default appearance 5',
    50
  ),
  createSeedAppearance(
    'appearance_custom',
    'CUSTOM',
    '6',
    'Default appearance 6',
    60
  ),
]

export function mapLegacyAppearanceMapping(
  mapping: LegacyAppearanceMapping
): ProductAppearance[] {
  const now = new Date().toISOString()

  return Object.entries(mapping)
    .sort(([leftCode], [rightCode]) => Number(leftCode) - Number(rightCode))
    .map(([barcodeCode, value], index) => ({
      id: `appearance_${barcodeCode}`,
      name: value.label?.trim() || `Appearance ${barcodeCode}`,
      barcodeCode,
      description: value.desc?.trim() || '',
      imageUrl: '',
      imageThumbnailUrl: '',
      imageName: '',
      active: value.label?.trim() !== '-',
      sortOrder: (index + 1) * 10,
      createdAt: now,
      updatedAt: now,
      version: 1,
    }))
}
