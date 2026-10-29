import type { ProductionMaterialIssuanceActiveProgressResponse } from '../contracts/production-material-issuance-active-order-scope-progress-api-dto'
import { createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture } from './production-material-issuance-reviewed-source-and-frozen-document-test-fixtures'

export function createProductionMaterialIssuanceActiveOrderProgressTestFixture(): ProductionMaterialIssuanceActiveProgressResponse {
  const fixture =
    createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
  const basis = fixture.review.sources[0]
  const material = basis.contributions[0]
  const identity = {
    materialId: material.materialId,
    materialCode: material.materialCode,
    materialName: material.materialName,
    unit: material.unit,
  }
  return {
    asOf: '2026-10-27T09:00:00Z',
    warehouseCategoryCode: 'MATERIAL',
    materialsPage: 1,
    ordersPage: 1,
    pageSize: 20,
    scope: {
      activeOrderCount: 1,
      sourceLineCount: 3,
      dispatchedLineCount: 2,
      undispatchedLineCount: 1,
      issueLineCount: 1,
      materialCount: 1,
      isComplete: false,
    },
    materials: [
      {
        ...identity,
        standardQty: 400,
        issuedQty: 380,
        returnedQty: 0,
        netQty: 380,
        remainingQty: 40,
        excessQty: 20,
        sourceLineCount: 2,
      },
    ],
    orderLines: [
      {
        salesOrderId: basis.salesOrderId,
        salesOrderLineId: 101,
        orderNo: basis.orderNo,
        lineNo: 1,
        customerName: basis.customerName,
        productName: basis.productName,
        finishedQty: 100,
        finishedUnit: basis.finishedUnit,
        documentId: fixture.detail.document.id,
        documentNo: fixture.detail.document.documentNo,
        bom: basis.bom,
        issueCode: '',
        materials: [
          {
            ...identity,
            salesOrderLineId: 101,
            sourceSnapshotId: '30000000-0000-4000-8000-000000000001',
            position: 1,
            standardQty: 200,
            issuedQty: 220,
            returnedQty: 0,
            netQty: 220,
            remainingQty: 0,
            excessQty: 20,
          },
        ],
      },
      {
        salesOrderId: basis.salesOrderId,
        salesOrderLineId: 102,
        orderNo: basis.orderNo,
        lineNo: 2,
        customerName: basis.customerName,
        productName: basis.productName,
        finishedQty: 100,
        finishedUnit: basis.finishedUnit,
        documentId: fixture.detail.document.id,
        documentNo: fixture.detail.document.documentNo,
        bom: basis.bom,
        issueCode: '',
        materials: [
          {
            ...identity,
            salesOrderLineId: 102,
            sourceSnapshotId: '30000000-0000-4000-8000-000000000002',
            position: 2,
            standardQty: 200,
            issuedQty: 160,
            returnedQty: 0,
            netQty: 160,
            remainingQty: 40,
            excessQty: 0,
          },
        ],
      },
      {
        salesOrderId: basis.salesOrderId,
        salesOrderLineId: 103,
        orderNo: basis.orderNo,
        lineNo: 3,
        customerName: basis.customerName,
        productName: 'Missing production recipe',
        finishedQty: 50,
        finishedUnit: basis.finishedUnit,
        documentId: '',
        documentNo: '',
        bom: null,
        issueCode: 'MISSING_BOM',
        materials: [],
      },
    ],
  }
}
