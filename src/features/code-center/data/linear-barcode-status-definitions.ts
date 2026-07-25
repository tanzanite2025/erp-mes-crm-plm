import { type TranslationKey } from '@/locales'

export type LinearBarcodeStatusDefinitionKind = 'inventory' | 'production'

export type LinearBarcodeStatusDefinitionTone =
  | 'neutral'
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'accent'

export interface LinearBarcodeStatusDefinition {
  code: string
  kind: LinearBarcodeStatusDefinitionKind
  labelKey: TranslationKey
  descriptionKey: TranslationKey
  phaseKey: TranslationKey
  triggerKey: TranslationKey
  sourceTable: string
  tone: LinearBarcodeStatusDefinitionTone
  isTerminal: boolean
}

export const LINEAR_BARCODE_INVENTORY_STATUS_DEFINITIONS: readonly LinearBarcodeStatusDefinition[] =
  [
    {
      code: 'AVAILABLE',
      kind: 'inventory',
      labelKey:
        'codeCenter.linearBarcode.status.definitions.inventory.AVAILABLE.label',
      descriptionKey:
        'codeCenter.linearBarcode.status.definitions.inventory.AVAILABLE.description',
      phaseKey:
        'codeCenter.linearBarcode.status.definitions.inventory.AVAILABLE.phase',
      triggerKey:
        'codeCenter.linearBarcode.status.definitions.inventory.AVAILABLE.trigger',
      sourceTable: 'linear_barcode_inventory_items',
      tone: 'success',
      isTerminal: false,
    },
    {
      code: 'BOUND',
      kind: 'inventory',
      labelKey:
        'codeCenter.linearBarcode.status.definitions.inventory.BOUND.label',
      descriptionKey:
        'codeCenter.linearBarcode.status.definitions.inventory.BOUND.description',
      phaseKey:
        'codeCenter.linearBarcode.status.definitions.inventory.BOUND.phase',
      triggerKey:
        'codeCenter.linearBarcode.status.definitions.inventory.BOUND.trigger',
      sourceTable: 'linear_barcode_inventory_items',
      tone: 'info',
      isTerminal: false,
    },
    {
      code: 'EXPIRED',
      kind: 'inventory',
      labelKey:
        'codeCenter.linearBarcode.status.definitions.inventory.EXPIRED.label',
      descriptionKey:
        'codeCenter.linearBarcode.status.definitions.inventory.EXPIRED.description',
      phaseKey:
        'codeCenter.linearBarcode.status.definitions.inventory.EXPIRED.phase',
      triggerKey:
        'codeCenter.linearBarcode.status.definitions.inventory.EXPIRED.trigger',
      sourceTable: 'linear_barcode_inventory_items',
      tone: 'warning',
      isTerminal: true,
    },
    {
      code: 'SCRAPPED',
      kind: 'inventory',
      labelKey:
        'codeCenter.linearBarcode.status.definitions.inventory.SCRAPPED.label',
      descriptionKey:
        'codeCenter.linearBarcode.status.definitions.inventory.SCRAPPED.description',
      phaseKey:
        'codeCenter.linearBarcode.status.definitions.inventory.SCRAPPED.phase',
      triggerKey:
        'codeCenter.linearBarcode.status.definitions.inventory.SCRAPPED.trigger',
      sourceTable: 'linear_barcode_inventory_items',
      tone: 'danger',
      isTerminal: true,
    },
  ]

export const LINEAR_BARCODE_PRODUCTION_STATE_DEFINITIONS: readonly LinearBarcodeStatusDefinition[] =
  [
    {
      code: 'NOT_STARTED',
      kind: 'production',
      labelKey:
        'codeCenter.linearBarcode.status.definitions.production.NOT_STARTED.label',
      descriptionKey:
        'codeCenter.linearBarcode.status.definitions.production.NOT_STARTED.description',
      phaseKey:
        'codeCenter.linearBarcode.status.definitions.production.NOT_STARTED.phase',
      triggerKey:
        'codeCenter.linearBarcode.status.definitions.production.NOT_STARTED.trigger',
      sourceTable: 'product_barcode_states',
      tone: 'neutral',
      isTerminal: false,
    },
    {
      code: 'IN_PROGRESS',
      kind: 'production',
      labelKey:
        'codeCenter.linearBarcode.status.definitions.production.IN_PROGRESS.label',
      descriptionKey:
        'codeCenter.linearBarcode.status.definitions.production.IN_PROGRESS.description',
      phaseKey:
        'codeCenter.linearBarcode.status.definitions.production.IN_PROGRESS.phase',
      triggerKey:
        'codeCenter.linearBarcode.status.definitions.production.IN_PROGRESS.trigger',
      sourceTable: 'product_barcode_states',
      tone: 'info',
      isTerminal: false,
    },
    {
      code: 'COMPLETED',
      kind: 'production',
      labelKey:
        'codeCenter.linearBarcode.status.definitions.production.COMPLETED.label',
      descriptionKey:
        'codeCenter.linearBarcode.status.definitions.production.COMPLETED.description',
      phaseKey:
        'codeCenter.linearBarcode.status.definitions.production.COMPLETED.phase',
      triggerKey:
        'codeCenter.linearBarcode.status.definitions.production.COMPLETED.trigger',
      sourceTable: 'product_barcode_states',
      tone: 'success',
      isTerminal: true,
    },
    {
      code: 'HOLD',
      kind: 'production',
      labelKey:
        'codeCenter.linearBarcode.status.definitions.production.HOLD.label',
      descriptionKey:
        'codeCenter.linearBarcode.status.definitions.production.HOLD.description',
      phaseKey:
        'codeCenter.linearBarcode.status.definitions.production.HOLD.phase',
      triggerKey:
        'codeCenter.linearBarcode.status.definitions.production.HOLD.trigger',
      sourceTable: 'product_barcode_states',
      tone: 'warning',
      isTerminal: false,
    },
    {
      code: 'REWORK',
      kind: 'production',
      labelKey:
        'codeCenter.linearBarcode.status.definitions.production.REWORK.label',
      descriptionKey:
        'codeCenter.linearBarcode.status.definitions.production.REWORK.description',
      phaseKey:
        'codeCenter.linearBarcode.status.definitions.production.REWORK.phase',
      triggerKey:
        'codeCenter.linearBarcode.status.definitions.production.REWORK.trigger',
      sourceTable: 'product_barcode_states',
      tone: 'accent',
      isTerminal: false,
    },
  ]

export const LINEAR_BARCODE_STATUS_DEFINITIONS: readonly LinearBarcodeStatusDefinition[] =
  [
    ...LINEAR_BARCODE_INVENTORY_STATUS_DEFINITIONS,
    ...LINEAR_BARCODE_PRODUCTION_STATE_DEFINITIONS,
  ]

export function countTerminalLinearBarcodeStatusDefinitions(
  definitions: readonly LinearBarcodeStatusDefinition[]
): number {
  return definitions.filter((definition) => definition.isTerminal).length
}
