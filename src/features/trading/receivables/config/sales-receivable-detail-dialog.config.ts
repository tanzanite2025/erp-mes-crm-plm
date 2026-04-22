import type { SettlementLedgerDetailDialogConfig } from '../../settlement-ledger-detail-dialog'
import type { ReceivableDetailApiDTO, ReceivableRecordApiDTO } from '../contracts/receivable-api-dto'

export const salesReceivableDetailDialogConfig: SettlementLedgerDetailDialogConfig<ReceivableDetailApiDTO, ReceivableRecordApiDTO> = {
  dialogTitle: '应收详情',
  ledgerKindLabel: '应收',
  actionLabel: '收款',
  partnerLabel: '客户',
  amountLabel: '未收',
  fieldPrefix: 'receivable',
  relationKey: 'receiptRecordId',
  recordType: 'receipt',
  allocationMode: 'single-ledger',
  uploadPath: '/sales-orders/evidence/upload',
  getDetailPartnerName: (item: ReceivableDetailApiDTO) => item.customerName,
  getLocalLedgerPartnerName: (item: ReceivableRecordApiDTO) => item.customerName,
} satisfies SettlementLedgerDetailDialogConfig<ReceivableDetailApiDTO, ReceivableRecordApiDTO>
