import { getCurrentLocale } from '@/lib/locale'
import { type AppLocale, type TranslationKey, translate } from '@/locales'

export const INVENTORY_ERROR_CODES = [
  'INVENTORY_QUERY_FAILED',
  'INVENTORY_INBOUND_VALIDATION_FAILED',
  'INVENTORY_INBOUND_FAILED',
  'INVENTORY_SHIPMENT_VALIDATION_FAILED',
  'INVENTORY_SHIPMENT_CREATE_FAILED',
  'INVENTORY_SHIPMENT_NOT_FOUND',
  'INVENTORY_SHIPMENT_NOT_DRAFT',
  'INVENTORY_COMMIT_FAILED',
  'INVENTORY_TRANSFER_VALIDATION_FAILED',
  'INVENTORY_TRANSFER_FAILED',
  'INVENTORY_RECONCILE_FAILED',
  'INVENTORY_VOID_FORBIDDEN',
  'INVENTORY_VOID_IN_PROGRESS',
  'INVENTORY_VOID_FAILED',
  'INVENTORY_BULK_SYNC_VALIDATION_FAILED',
  'INVENTORY_BULK_SYNC_FAILED',
] as const

export type InventoryErrorCode = typeof INVENTORY_ERROR_CODES[number]

export interface InventoryErrorMeta {
  status: number
  trigger: string
  translationKey: TranslationKey
}

export const INVENTORY_ERROR_META: Record<InventoryErrorCode, InventoryErrorMeta> = {
  INVENTORY_QUERY_FAILED: {
    status: 500,
    trigger: 'Failed to load inventory list from backend.',
    translationKey: 'warehouse.errors.queryFailed',
  },
  INVENTORY_INBOUND_VALIDATION_FAILED: {
    status: 400,
    trigger: 'Inbound request payload validation failed.',
    translationKey: 'warehouse.errors.inboundValidationFailed',
  },
  INVENTORY_INBOUND_FAILED: {
    status: 500,
    trigger: 'Inbound transaction failed.',
    translationKey: 'warehouse.errors.inboundFailed',
  },
  INVENTORY_SHIPMENT_VALIDATION_FAILED: {
    status: 400,
    trigger: 'Shipment draft payload validation failed.',
    translationKey: 'warehouse.errors.shipmentValidationFailed',
  },
  INVENTORY_SHIPMENT_CREATE_FAILED: {
    status: 500,
    trigger: 'Failed to create shipment draft.',
    translationKey: 'warehouse.errors.shipmentCreateFailed',
  },
  INVENTORY_SHIPMENT_NOT_FOUND: {
    status: 404,
    trigger: 'Shipment record does not exist.',
    translationKey: 'warehouse.errors.shipmentNotFound',
  },
  INVENTORY_SHIPMENT_NOT_DRAFT: {
    status: 400,
    trigger: 'Shipment is not in DRAFT status when committing.',
    translationKey: 'warehouse.errors.shipmentNotDraft',
  },
  INVENTORY_COMMIT_FAILED: {
    status: 500,
    trigger: 'Commit shipment transaction failed.',
    translationKey: 'warehouse.errors.commitFailed',
  },
  INVENTORY_TRANSFER_VALIDATION_FAILED: {
    status: 400,
    trigger: 'Transfer payload validation failed.',
    translationKey: 'warehouse.errors.transferValidationFailed',
  },
  INVENTORY_TRANSFER_FAILED: {
    status: 500,
    trigger: 'Transfer transaction failed.',
    translationKey: 'warehouse.errors.transferFailed',
  },
  INVENTORY_RECONCILE_FAILED: {
    status: 500,
    trigger: 'Reconcile operation failed.',
    translationKey: 'warehouse.errors.reconcileFailed',
  },
  INVENTORY_VOID_FORBIDDEN: {
    status: 403,
    trigger: 'Approval or permission check failed before void.',
    translationKey: 'warehouse.errors.voidForbidden',
  },
  INVENTORY_VOID_IN_PROGRESS: {
    status: 409,
    trigger: 'Distributed lock is held by another void operation.',
    translationKey: 'warehouse.errors.voidInProgress',
  },
  INVENTORY_VOID_FAILED: {
    status: 500,
    trigger: 'Void shipment transaction failed.',
    translationKey: 'warehouse.errors.voidFailed',
  },
  INVENTORY_BULK_SYNC_VALIDATION_FAILED: {
    status: 400,
    trigger: 'Bulk sync payload validation failed.',
    translationKey: 'warehouse.errors.bulkSyncValidationFailed',
  },
  INVENTORY_BULK_SYNC_FAILED: {
    status: 500,
    trigger: 'Bulk sync transaction failed.',
    translationKey: 'warehouse.errors.bulkSyncFailed',
  },
}

export const DEFAULT_INVENTORY_ERROR_TIP_KEY: TranslationKey = 'warehouse.errors.default'

export function isInventoryErrorCode(code: unknown): code is InventoryErrorCode {
  return typeof code === 'string' && (INVENTORY_ERROR_CODES as readonly string[]).includes(code)
}

export function getInventoryErrorMeta(code: unknown): InventoryErrorMeta | undefined {
  if (!isInventoryErrorCode(code)) return undefined
  return INVENTORY_ERROR_META[code]
}

type ErrorLike = {
  code?: unknown
}

function asErrorLike(input: unknown): ErrorLike {
  if (!input || typeof input !== 'object') return {}
  return input as ErrorLike
}

export function resolveInventoryErrorTip(
  error: unknown,
  locale: AppLocale = getCurrentLocale()
): string {
  const maybeError = asErrorLike(error)
  const meta = getInventoryErrorMeta(maybeError.code)

  if (meta) {
    return translate(locale, meta.translationKey)
  }

  return translate(locale, DEFAULT_INVENTORY_ERROR_TIP_KEY)
}
