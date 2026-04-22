import { describe, expect, it } from 'vitest'

import { purchasePayableDetailDialogConfig } from './purchase-payable-detail-dialog.config'

describe('purchase-payable-detail-dialog.config', () => {
  it('locks payable-specific labels and routing semantics', () => {
    expect(purchasePayableDetailDialogConfig).toMatchObject({
      dialogTitle: '应付详情',
      ledgerKindLabel: '应付',
      actionLabel: '付款',
      partnerLabel: '供应商',
      amountLabel: '未付',
      fieldPrefix: 'payable',
      relationKey: 'paymentRecordId',
      recordType: 'payment',
      uploadPath: '/purchase/evidence/upload',
    })
  })

  it('maps payable partner names from detail and list items consistently', () => {
    expect(
      purchasePayableDetailDialogConfig.getDetailPartnerName({
        supplierName: '明光材料',
      } as never)
    ).toBe('明光材料')

    expect(
      purchasePayableDetailDialogConfig.getLocalLedgerPartnerName({
        supplierName: '晨星供应',
      } as never)
    ).toBe('晨星供应')
  })
})
