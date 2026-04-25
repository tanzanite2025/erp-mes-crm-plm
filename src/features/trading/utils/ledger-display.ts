import type { TranslationKey } from '@/locales'

export const TRADING_LEDGER_STATUS_OPTIONS = ['OPEN', 'PARTIAL', 'OVERDUE', 'SETTLED'] as const
export const TRADING_LEDGER_STATUS_LABEL_OPTIONS = [...TRADING_LEDGER_STATUS_OPTIONS, 'CANCELLED'] as const
export const TRADING_LEDGER_AGING_BUCKET_OPTIONS = ['OPEN', 'CURRENT', 'OVERDUE', 'SETTLED', 'CANCELLED'] as const

export type TradingLedgerStatus = (typeof TRADING_LEDGER_STATUS_LABEL_OPTIONS)[number]
export type TradingLedgerAgingBucket = (typeof TRADING_LEDGER_AGING_BUCKET_OPTIONS)[number]

type LedgerTranslator = (key: TranslationKey) => string

function normalizeLedgerValue(value: string) {
  return value.trim().toUpperCase()
}

export function getTradingLedgerStatusLabel(
  status: string,
  t: LedgerTranslator
) {
  switch (normalizeLedgerValue(status)) {
    case 'OPEN':
      return t('trading.ledger.statuses.OPEN')
    case 'PARTIAL':
      return t('trading.ledger.statuses.PARTIAL')
    case 'OVERDUE':
      return t('trading.ledger.statuses.OVERDUE')
    case 'SETTLED':
      return t('trading.ledger.statuses.SETTLED')
    case 'CANCELLED':
      return t('trading.ledger.statuses.CANCELLED')
    default:
      return status
  }
}

export function getTradingLedgerAgingLabel(
  agingBucket: string,
  t: LedgerTranslator
) {
  switch (normalizeLedgerValue(agingBucket)) {
    case 'CURRENT':
      return t('trading.ledger.agingBuckets.CURRENT')
    case 'OVERDUE':
      return t('trading.ledger.agingBuckets.OVERDUE')
    case 'SETTLED':
      return t('trading.ledger.agingBuckets.SETTLED')
    case 'CANCELLED':
      return t('trading.ledger.agingBuckets.CANCELLED')
    default:
      return agingBucket
  }
}

export function getTradingLedgerStatusOptions(
  t: LedgerTranslator
) {
  return TRADING_LEDGER_STATUS_OPTIONS.map((value) => ({
    value,
    label: getTradingLedgerStatusLabel(value, t),
  }))
}
