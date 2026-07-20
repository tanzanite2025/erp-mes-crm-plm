import { describe, expect, it } from 'vitest'
import { parseAuditEngineStatsResponse } from './schema'

describe('audit engine stats schema', () => {
  it('parses the integration and hot-window activity contract independently', () => {
    const result = parseAuditEngineStatsResponse({
      hotWindowDays: 30,
      unmappedLogEntities: ['legacy-entity'],
      unmappedLogEntityCount: 1,
      modules: [
        {
          id: 'engineering',
          targetEntityCount: 5,
          integratedEntityCount: 4,
          activeEntityCount: 2,
          integrationCoverage: 80,
          activityCoverage: 40,
          connected: false,
          status: 'ALERT',
          lastEvent: '2026-07-20T08:00:00Z',
          integratedEntities: ['product', 'engineering-spec'],
          activeEntities: ['engineering-spec'],
          missingIntegrationEntities: ['change-order'],
          entryCoverage: 10,
          logCoverage: 20,
        },
      ],
    })

    expect(result).toEqual({
      hotWindowDays: 30,
      unmappedLogEntities: ['legacy-entity'],
      unmappedLogEntityCount: 1,
      modules: [
        {
          id: 'engineering',
          targetEntityCount: 5,
          integratedEntityCount: 4,
          activeEntityCount: 2,
          integrationCoverage: 80,
          activityCoverage: 40,
          connected: false,
          status: 'ALERT',
          lastEvent: '2026-07-20T08:00:00Z',
          integratedEntities: ['product', 'engineering-spec'],
          activeEntities: ['engineering-spec'],
          missingIntegrationEntities: ['change-order'],
        },
      ],
    })
  })

  it('falls back to legacy counts without trusting the old connected status', () => {
    const result = parseAuditEngineStatsResponse({
      modules: [
        {
          id: 'trading',
          targetEntityCount: 5,
          entryEntityCount: 4,
          loggedEntityCount: 1,
          entryCoverage: 80,
          logCoverage: 20,
          coverage: 50,
          connected: true,
          status: 'HEALTHY',
          entryEntities: ['sales-order', 'purchase-order'],
          loggedEntities: ['sales-order'],
        },
      ],
    })

    expect(result.modules[0]).toMatchObject({
      integratedEntityCount: 4,
      activeEntityCount: 1,
      integrationCoverage: 80,
      activityCoverage: 20,
      connected: false,
      status: 'ALERT',
      integratedEntities: ['sales-order', 'purchase-order'],
      activeEntities: ['sales-order'],
    })
    expect(result.modules[0]?.integrationCoverage).not.toBe(50)
    expect(result.modules[0]?.activityCoverage).not.toBe(50)
  })

  it('normalizes missing entity arrays to empty arrays', () => {
    const result = parseAuditEngineStatsResponse({
      modules: [
        {
          id: 'workflow',
          targetEntityCount: 1,
          integratedEntityCount: 0,
          activeEntityCount: 0,
          connected: false,
          status: 'CRITICAL',
        },
      ],
    })

    expect(result.hotWindowDays).toBe(30)
    expect(result.unmappedLogEntities).toEqual([])
    expect(result.unmappedLogEntityCount).toBe(0)
    expect(result.modules[0]).toMatchObject({
      integratedEntities: [],
      activeEntities: [],
      missingIntegrationEntities: [],
    })
  })

  it('falls back to a positive default for an invalid hot-window value', () => {
    expect(
      parseAuditEngineStatsResponse({ hotWindowDays: 0 }).hotWindowDays
    ).toBe(30)
    expect(
      parseAuditEngineStatsResponse({ hotWindowDays: -7 }).hotWindowDays
    ).toBe(30)
    expect(
      parseAuditEngineStatsResponse({ hotWindowDays: '30' }).hotWindowDays
    ).toBe(30)
    expect(
      parseAuditEngineStatsResponse({ hotWindowDays: 45.8 }).hotWindowDays
    ).toBe(45)
  })

  it('calculates coverage from validated counts when coverage fields are invalid', () => {
    const result = parseAuditEngineStatsResponse({
      modules: [
        {
          id: 'finance',
          targetEntityCount: 4,
          integratedEntityCount: 3,
          activeEntityCount: 1,
          integrationCoverage: Number.NaN,
          entryCoverage: 75,
          activityCoverage: Number.POSITIVE_INFINITY,
          logCoverage: 25,
        },
      ],
    })

    expect(result.modules[0]).toMatchObject({
      integrationCoverage: 75,
      activityCoverage: 25,
    })
  })

  it.each([
    {
      name: 'missing integrated count',
      module: {
        id: 'finance',
        targetEntityCount: 1,
        activeEntityCount: 0,
      },
      field: 'integratedEntityCount',
    },
    {
      name: 'non-finite active count',
      module: {
        id: 'finance',
        targetEntityCount: 1,
        integratedEntityCount: 0,
        activeEntityCount: Number.POSITIVE_INFINITY,
      },
      field: 'activeEntityCount',
    },
    {
      name: 'negative target count',
      module: {
        id: 'finance',
        targetEntityCount: -1,
        integratedEntityCount: 0,
        activeEntityCount: 0,
      },
      field: 'targetEntityCount',
    },
  ])('rejects $name instead of coercing it to zero', ({ module, field }) => {
    expect(() => parseAuditEngineStatsResponse({ modules: [module] })).toThrow(
      field
    )
  })

  it('rejects an invalid new count instead of masking it with a legacy count', () => {
    expect(() =>
      parseAuditEngineStatsResponse({
        modules: [
          {
            id: 'finance',
            targetEntityCount: 1,
            integratedEntityCount: Number.NaN,
            entryEntityCount: 1,
            activeEntityCount: 0,
          },
        ],
      })
    ).toThrow('integratedEntityCount')
  })

  it('rejects entity counts greater than the module target', () => {
    expect(() =>
      parseAuditEngineStatsResponse({
        modules: [
          {
            id: 'finance',
            targetEntityCount: 1,
            integratedEntityCount: 2,
            activeEntityCount: 0,
          },
        ],
      })
    ).toThrow('cannot exceed targetEntityCount')
  })
})
