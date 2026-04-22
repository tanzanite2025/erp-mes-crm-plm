import type { SettlementLedgerDetailDialogConfig } from '../../settlement-ledger-detail-dialog'
import type { PayableRecord } from '../adapters/payable-api-adapter'
import type { PayableDetailApiDTO } from '../contracts/payable-api-dto'

export const purchasePayableDetailDialogConfig: SettlementLedgerDetailDialogConfig<PayableDetailApiDTO, PayableRecord> = {
  dialogTitle: '应付详情',
  ledgerKindLabel: '应付',
  actionLabel: '付款',
  partnerLabel: '供应商',
  amountLabel: '未付',
  fieldPrefix: 'payable',
  relationKey: 'paymentRecordId',
  recordType: 'payment',
  allocationMode: 'single-ledger',
  uploadPath: '/purchase/evidence/upload',
  getDetailPartnerName: (item: PayableDetailApiDTO) => item.supplierName,
  getLocalLedgerPartnerName: (item: PayableRecord) => item.supplierName,
} satisfies SettlementLedgerDetailDialogConfig<PayableDetailApiDTO, PayableRecord>
