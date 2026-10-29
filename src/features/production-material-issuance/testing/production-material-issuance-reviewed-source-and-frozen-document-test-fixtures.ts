import type { ProductionMaterialIssuanceReviewedSourceBasis } from '../contracts/production-material-issuance-source-review-and-frozen-document-api-dto'

export function createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture() {
  const basis: ProductionMaterialIssuanceReviewedSourceBasis = {
    salesOrderId: '11111111-1111-4111-8111-111111111111',
    salesOrderLineId: 101,
    orderVersion: 4,
    orderNo: 'SO-HTTP',
    lineNo: 1,
    customerId: 'customer-1',
    customerName: '客户',
    productId: '22222222-2222-4222-8222-222222222222',
    productName: 'R50',
    finishedQty: 100,
    finishedUnit: 'PCS',
    bom: {
      id: '33333333-3333-4333-8333-333333333333',
      bomNo: 'MBOM-1',
      version: 3,
      revisionNo: 'A',
      bomVersion: 'V1',
      versionLevel: 'light',
      versionLevelLabelZh: '超轻版',
      versionLevelLabelEn: 'Ultralight',
      ownerType: 'INTERNAL',
      ownerCustomerId: '',
      measuredWeight: 420,
      measuredWeightUnit: 'g',
    },
    contributions: [
      {
        bomItemId: '44444444-4444-4444-8444-444444444444',
        materialId: '55555555-5555-4555-8555-555555555555',
        section: 'A',
        unit: 'kg',
        standardUsage: 0.5,
        requiredQty: 50,
        materialCode: 'M-1',
        materialName: '原材料',
        materialSpec: '规格',
      },
    ],
    basisFingerprint: 'a'.repeat(64),
  }
  const selection = {
    salesOrderId: basis.salesOrderId,
    salesOrderLineId: basis.salesOrderLineId,
    bomId: basis.bom.id,
  }
  const document = {
    id: '66666666-6666-4666-8666-666666666666',
    documentNo: 'PMI-66666666666646668666666666666666',
    version: 1,
    status: 'DISPATCHED' as const,
    warehouseCategoryCode: 'MATERIAL' as const,
    dispatchedBy: 'sender-1',
    dispatchedAt: '2026-10-27T02:30:00Z',
    withdrawnBy: '',
    withdrawnAt: null,
    withdrawalReason: '',
    warehouseExecutionAt: null,
  }
  const withdrawnDocument = {
    ...document,
    version: 2,
    status: 'WITHDRAWN' as const,
    withdrawnBy: 'operator-1',
    withdrawnAt: '2026-10-27T03:00:00Z',
    withdrawalReason: '重新核对重量',
  }
  return {
    basis,
    selection,
    review: { sources: [basis], warehouseCategoryCode: 'MATERIAL' },
    document,
    detail: { document, sources: [basis] },
    list: { items: [document], total: 1, page: 1, pageSize: 20 },
    withdrawnDetail: { document: withdrawnDocument, sources: [basis] },
  }
}
