export interface AppearanceMapping {
  [key: string]: {
    label: string
    desc: string
  }
}

export const APPEARANCE_MAPPING_KEY = 'xdfc_appearance_mapping'
export const APPEARANCE_MAPPING_QUERY_KEY = ['basic-settings', 'appearance-mapping'] as const

export const DEFAULT_APPEARANCE_MAPPING: AppearanceMapping = {
  '1': { label: 'UD', desc: 'Default appearance 1' },
  '2': { label: '3K', desc: 'Default appearance 2' },
  '3': { label: '12K', desc: 'Default appearance 3' },
  '4': { label: 'MARBLE', desc: 'Default appearance 4' },
  '5': { label: 'PAINT', desc: 'Default appearance 5' },
  '6': { label: 'CUSTOM', desc: 'Default appearance 6' },
  '7': { label: '-', desc: 'Reserved' },
  '8': { label: '-', desc: 'Reserved' },
  '9': { label: '-', desc: 'Reserved' },
}
