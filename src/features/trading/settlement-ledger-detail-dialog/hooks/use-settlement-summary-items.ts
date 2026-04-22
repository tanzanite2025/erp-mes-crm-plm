import { useMemo } from 'react'

import { formatSettlementMoney } from '../utils/format-settlement-money'
import type {
  SettlementDetailLike,
  SettlementLedgerDetailDialogConfig,
  SettlementLocalLedgerLike,
} from '../types'

interface UseSettlementSummaryItemsParams<
  TDetail extends SettlementDetailLike,
  TLocalLedger extends SettlementLocalLedgerLike,
> {
  detail: TDetail | null | undefined
  currencies: Array<{ code: string; status: string }>
  isCurrencyLoading: boolean
  config: Pick<
    SettlementLedgerDetailDialogConfig<TDetail, TLocalLedger>,
    'partnerLabel' | 'amountLabel' | 'getDetailPartnerName'
  >
}

export function useSettlementSummaryItems<
  TDetail extends SettlementDetailLike,
  TLocalLedger extends SettlementLocalLedgerLike,
>({ detail, currencies, isCurrencyLoading, config }: UseSettlementSummaryItemsParams<TDetail, TLocalLedger>) {
  const currencyOptions = useMemo(
    () => currencies.filter((item) => item.status === 'Active'),
    [currencies]
  )
  const summaryItems = useMemo(
    () => [
      { label: '单据编号', value: detail?.documentNo ?? '-' },
      { label: config.partnerLabel, value: detail ? config.getDetailPartnerName(detail) : '-' },
      { label: '开票金额', value: '待接入' },
      {
        label: `${config.amountLabel}金额`,
        value: detail ? formatSettlementMoney(detail.outstandingAmount, detail.currency) : '-',
      },
    ],
    [config, detail]
  )

  return {
    currencyOptions,
    isCurrencyOptionsUnavailable: !isCurrencyLoading && currencyOptions.length === 0,
    summaryItems,
  }
}
