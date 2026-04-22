import { describe, expect, it } from 'vitest'

import { salesReceivableDetailDialogConfig } from './sales-receivable-detail-dialog.config'

describe('sales-receivable-detail-dialog.config', () => {
  it('locks receivable-specific labels and routing semantics', () => {
    expect(salesReceivableDetailDialogConfig).toMatchObject({
      dialogTitle: '应收详情',
      ledgerKindLabel: '应收',
      actionLabel: '收款',
      partnerLabel: '客户',
      amountLabel: '未收',
      fieldPrefix: 'receivable',
      relationKey: 'receiptRecordId',
      recordType: 'receipt',
      uploadPath: '/sales-orders/evidence/upload',
    })
  })

  it('maps receivable partner names from detail and list items consistently', () => {
    expect(
      salesReceivableDetailDialogConfig.getDetailPartnerName({
        customerName: '华东客户',
      } as never)
    ).toBe('华东客户')

    expect(
      salesReceivableDetailDialogConfig.getLocalLedgerPartnerName({
        customerName: '北方客户',
      } as never)
    ).toBe('北方客户')
  })
})
