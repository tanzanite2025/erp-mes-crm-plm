export interface BarcodeRuleSegment {
  id: string
  range: string
  name: string
  length: number
  description: string
  examples: string[]
  type: 'fixed' | 'mapping' | 'auto'
  isEditable?: boolean
}
