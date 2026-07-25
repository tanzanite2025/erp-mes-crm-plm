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
  phase: string
  trigger: string
  sourceTable: string
  tone: LinearBarcodeStatusDefinitionTone
  isTerminal: boolean
}

export interface LinearBarcodeProductionLocationAnchor {
  code: string
  field: string
  sourceTable: string
  required: boolean
}

export interface LinearBarcodeStatusWritePolicy {
  code: string
  description: string
}

export interface LinearBarcodeStatusContract {
  inventoryStatuses: readonly LinearBarcodeStatusDefinition[]
  productionStatuses: readonly LinearBarcodeStatusDefinition[]
  productionLocationAnchors: readonly LinearBarcodeProductionLocationAnchor[]
  writePolicies: readonly LinearBarcodeStatusWritePolicy[]
}

export type LinearBarcodeStatusDefinitionTextField =
  | 'label'
  | 'description'
  | 'phase'
  | 'trigger'

export function countTerminalLinearBarcodeStatusDefinitions(
  definitions: readonly LinearBarcodeStatusDefinition[]
): number {
  return definitions.filter((definition) => definition.isTerminal).length
}

export function getLinearBarcodeStatusDefinitionTranslationKey(
  definition: LinearBarcodeStatusDefinition,
  field: LinearBarcodeStatusDefinitionTextField
): TranslationKey {
  return `codeCenter.linearBarcode.status.definitions.${definition.kind}.${definition.code}.${field}` as TranslationKey
}

export function getLinearBarcodeLocationAnchorTranslationKey(
  anchor: LinearBarcodeProductionLocationAnchor,
  field: 'label' | 'description'
): TranslationKey {
  return `codeCenter.linearBarcode.status.locationAnchors.${anchor.code}.${field}` as TranslationKey
}

export function getLinearBarcodeWritePolicyTranslationKey(
  policy: LinearBarcodeStatusWritePolicy
): TranslationKey {
  return `codeCenter.linearBarcode.status.writePolicies.${policy.code}` as TranslationKey
}

export function mergeLinearBarcodeStatusDefinitions(
  contract: LinearBarcodeStatusContract
): readonly LinearBarcodeStatusDefinition[] {
  return [...contract.inventoryStatuses, ...contract.productionStatuses]
}
