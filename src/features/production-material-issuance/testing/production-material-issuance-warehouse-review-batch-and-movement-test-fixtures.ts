import type {
  ProductionMaterialIssuanceWarehouseReview,
  ProductionMaterialIssuanceWarehouseCommandResult,
} from '../contracts/production-material-issuance-warehouse-review-batch-availability-and-confirmed-movement-api-dto'
import { createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture } from './production-material-issuance-reviewed-source-and-frozen-document-test-fixtures'

export function createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture() {
  const source =
    createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
  const materialId = source.basis.contributions[0].materialId
  const sourceSnapshotId = '77777777-7777-4777-8777-777777777777'
  const inventoryId = '88888888-8888-4888-8888-888888888888'
  const review: ProductionMaterialIssuanceWarehouseReview = {
    warehouseActionBlockers: { issue: '', supplement: '', return: '' },
    document: source.document,
    sourceMaterials: [
      {
        sourceSnapshotId,
        salesOrderLineId: 101,
        position: 1,
        materialId,
        materialCode: 'M-1',
        materialName: '原材料',
        unit: 'kg',
        standardQty: 50,
        issuedQty: 0,
        returnedQty: 0,
        netQty: 0,
        remainingQty: 50,
        excessQty: 0,
      },
    ],
    materialTotals: [
      {
        materialId,
        unit: 'kg',
        standardQty: 50,
        issuedQty: 0,
        returnedQty: 0,
        netQty: 0,
        remainingQty: 50,
        excessQty: 0,
      },
    ],
    movements: [],
    returnableAllocations: [],
  }
  const batches = {
    documentId: source.document.id,
    expectedVersion: 1,
    materialId,
    unit: 'kg',
    items: [
      {
        inventoryId,
        materialId,
        categoryCode: 'MATERIAL' as const,
        batchNo: 'batch-A',
        unit: 'kg',
        inventoryQty: 100,
        reservedQty: 30,
        availableQty: 70,
      },
    ],
  }
  const suggestion = {
    documentId: source.document.id,
    expectedVersion: 1,
    materialId,
    quantity: 10,
    allocations: [
      { salesOrderLineId: 101, quantity: 10, originalAllocationId: null },
    ],
  }
  const result: ProductionMaterialIssuanceWarehouseCommandResult = {
    document: {
      ...source.document,
      version: 2,
      warehouseExecutionAt: '2026-10-27T03:00:00Z',
    },
    movement: {
      movement: {
        id: '99999999-9999-4999-8999-999999999999',
        documentId: source.document.id,
        documentVersionAfter: 2,
        kind: 'ISSUE',
        reason: '',
        confirmedBy: 'warehouse-1',
        confirmedAt: '2026-10-27T03:00:00Z',
      },
      materials: [
        {
          material: {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            movementId: '99999999-9999-4999-8999-999999999999',
            materialId,
            batchNo: 'batch-A',
            unit: 'kg',
            quantity: 10,
            unitCost: 5,
            totalValue: 50,
            sourceInventoryId: inventoryId,
            targetInventoryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            outboundLedgerEntryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            inboundLedgerEntryId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          },
          allocations: [
            {
              id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
              movementMaterialId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              sourceSnapshotId,
              salesOrderLineId: 101,
              quantity: 10,
              originalAllocationId: null,
            },
          ],
        },
      ],
    },
  }
  const issuedReview: ProductionMaterialIssuanceWarehouseReview = {
    ...review,
    document: result.document,
    sourceMaterials: review.sourceMaterials.map((row) => ({
      ...row,
      issuedQty: 10,
      netQty: 10,
      remainingQty: 40,
    })),
    materialTotals: review.materialTotals.map((row) => ({
      ...row,
      issuedQty: 10,
      netQty: 10,
      remainingQty: 40,
    })),
    movements: [result.movement],
    returnableAllocations: [
      {
        originalAllocationId: result.movement.materials[0].allocations[0].id,
        salesOrderLineId: 101,
        materialId,
        batchNo: 'batch-A',
        unit: 'kg',
        returnableQty: 10,
      },
    ],
  }
  return {
    ...source,
    materialId,
    review,
    batches,
    suggestion,
    result,
    issuedReview,
  }
}
