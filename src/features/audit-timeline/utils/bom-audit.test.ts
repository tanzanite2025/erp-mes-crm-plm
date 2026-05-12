import { describe, expect, it } from 'vitest'
import { buildBomAuditSummary } from './bom-audit'
import type { AuditLog } from '../types'

function createAuditLog(diff: AuditLog['diff'], action = 'SAVE'): AuditLog {
  return {
    id: 'audit-bom-1',
    module: 'bom',
    target_id: 'bom-1',
    action,
    diff,
    operator: 'auditor',
    ip: '127.0.0.1',
    created_at: '2026-05-03T13:00:00.000Z',
  }
}

describe('bom audit utils', () => {
  it('builds aggregated item and control change summary from before/after snapshots', () => {
    const log = createAuditLog([
      { f: 'bomNo', o: 'BOM-001', n: 'BOM-001', a: 'bomNo' },
      { f: 'status', o: 'draft', n: 'active', a: 'status' },
      { f: 'operation', o: undefined, n: 'update', a: 'operation' },
      {
        f: 'items',
        o: [
          {
            id: 'item-1',
            section: 'RIM',
            materialId: 'MAT-001',
            unitPrice: 10,
            unit: 'pcs',
            unitUsage: 1,
            wastagePercent: 3,
            materialType: 'RAW',
            supplyChannel: 'BUY',
          },
          {
            id: 'item-2',
            section: 'SPOKE',
            materialId: 'MAT-002',
            unitPrice: 5,
            unit: 'pcs',
            unitUsage: 2,
            wastagePercent: 3,
            materialType: 'RAW',
            supplyChannel: 'BUY',
          },
        ],
        n: [
          {
            id: 'item-1',
            section: 'RIM',
            materialId: 'MAT-001',
            unitPrice: 10,
            unit: 'pcs',
            unitUsage: 1.5,
            wastagePercent: 3,
            materialType: 'RAW',
            supplyChannel: 'BUY',
          },
          {
            id: 'item-3',
            section: 'HUB',
            materialId: 'MAT-003',
            unitPrice: 6,
            unit: 'pcs',
            unitUsage: 1,
            wastagePercent: 2,
            materialType: 'RAW',
            supplyChannel: 'MAKE',
          },
        ],
        a: 'items',
      },
    ])

    const summary = buildBomAuditSummary(log)

    expect(summary.operation).toBe('update')
    expect(summary.targetBomNo).toBe('BOM-001')
    expect(summary.beforeItemCount).toBe(2)
    expect(summary.afterItemCount).toBe(2)
    expect(summary.addedItems).toEqual([
      { key: 'item-3', section: 'HUB', materialId: 'MAT-003' },
    ])
    expect(summary.removedItems).toEqual([
      { key: 'item-2', section: 'SPOKE', materialId: 'MAT-002' },
    ])
    expect(summary.modifiedItems).toHaveLength(1)
    expect(summary.modifiedItems[0].key).toBe('item-1')
    expect(summary.modifiedItems[0].changedFields).toEqual(['unitUsage'])
    expect(summary.controlChanges).toEqual([
      { key: 'status', beforeValue: 'draft', afterValue: 'active' },
    ])
  })

  it('treats delete audit as removing all previous BOM items', () => {
    const log = createAuditLog(
      [
        { f: 'bomNo', o: 'BOM-DELETE', n: 'BOM-DELETE', a: 'bomNo' },
        { f: 'operation', o: undefined, n: 'delete', a: 'operation' },
        {
          f: 'items',
          o: [
            {
              id: 'item-1',
              section: 'RIM',
              materialId: 'MAT-001',
              unitPrice: 10,
              unit: 'pcs',
              unitUsage: 1,
              wastagePercent: 3,
              materialType: 'RAW',
              supplyChannel: 'BUY',
            },
          ],
          n: [
            {
              id: 'item-1',
              section: 'RIM',
              materialId: 'MAT-001',
              unitPrice: 10,
              unit: 'pcs',
              unitUsage: 1,
              wastagePercent: 3,
              materialType: 'RAW',
              supplyChannel: 'BUY',
            },
          ],
          a: 'items',
        },
      ],
      'DELETE',
    )

    const summary = buildBomAuditSummary(log)

    expect(summary.operation).toBe('delete')
    expect(summary.beforeItemCount).toBe(1)
    expect(summary.afterItemCount).toBe(0)
    expect(summary.addedItems).toEqual([])
    expect(summary.removedItems).toEqual([
      { key: 'item-1', section: 'RIM', materialId: 'MAT-001' },
    ])
    expect(summary.modifiedItems).toEqual([])
  })
})
