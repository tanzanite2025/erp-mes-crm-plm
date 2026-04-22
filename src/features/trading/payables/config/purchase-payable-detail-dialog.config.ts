import type { SettlementLedgerDetailDialogConfig } from '../../settlement-ledger-detail-dialog'
import type { PayableDetailApiDTO, PayableRecordApiDTO } from '../contracts/payable-api-dto'

export const purchasePayableDetailDialogConfig: SettlementLedgerDetailDialogConfig<PayableDetailApiDTO, PayableRecordApiDTO> = {
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
  getLocalLedgerPartnerName: (item: PayableRecordApiDTO) => item.supplierName,
} satisfies SettlementLedgerDetailDialogConfig<PayableDetailApiDTO, PayableRecordApiDTO>
