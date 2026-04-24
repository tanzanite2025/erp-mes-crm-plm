import type { SettlementLedgerDetailDialogConfig } from '../../settlement-ledger-detail-dialog'
import type { ReceivableRecord } from '../adapters/receivable-api-adapter'
import type { ReceivableDetailApiDTO } from '../contracts/receivable-api-dto'

export const salesReceivableDetailDialogConfig: SettlementLedgerDetailDialogConfig<ReceivableDetailApiDTO, ReceivableRecord> = {
  dialogTitle: '应收详情',
  ledgerKindLabel: '应收',
  actionLabel: '收款',
  partnerLabel: '客户',
  amountLabel: '未收',
  summaryAmountLabel: '订单金额',
  fieldPrefix: 'receivable',
  relationKey: 'receiptRecordId',
  recordType: 'receipt',
  allocationMode: 'single-ledger',
  uploadPath: '/sales-orders/evidence/upload',
  getDetailPartnerName: (item: ReceivableDetailApiDTO) => item.customerName,
  getLocalLedgerPartnerName: (item: ReceivableRecord) => item.customerName,
  getDetailSummaryAmount: (item: ReceivableDetailApiDTO) => item.orderAmount,
} satisfies SettlementLedgerDetailDialogConfig<ReceivableDetailApiDTO, ReceivableRecord>
