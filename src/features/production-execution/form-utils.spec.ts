import { describe, expect, it } from 'vitest'
import type { ProductionRoute } from '@/features/production-shared/data/production-route'
import {
  buildProductionExecutionCommandInput,
  resolveProductionExecutionLifecycleProcessName,
  resolveProductionExecutionCaptureSource,
  type ProductionExecutionFormValues,
} from './form-utils'

const baseValues: ProductionExecutionFormValues = {
  productBarcode: ' BAR-001 ',
  captureMode: 'manual',
  action: 'START',
  productionWorkLocationId: 'location-1',
  targetRouteStepId: '',
  result: '',
  notes: 'begin',
  fromHolderType: '',
  fromHolderId: '',
  toHolderType: '',
  toHolderId: '',
}

describe('production execution form utils', () => {
  it('does not send a previous rework destination when completing or starting a process', () => {
    for (const action of ['START', 'COMPLETE', 'HOLD'] as const) {
      expect(
        buildProductionExecutionCommandInput({
          ...baseValues,
          action,
          targetRouteStepId: 'old-rework-step',
        })
      ).toMatchObject({ targetRouteStepId: '' })
    }
  })
  it('maps USB capture mode to the unified hardware source', () => {
    expect(resolveProductionExecutionCaptureSource('usb')).toBe('hardware')
    expect(resolveProductionExecutionCaptureSource('camera')).toBe('camera')
  })

  it('uses the route step identity when a process appears more than once', () => {
    const route: ProductionRoute = {
      id: 'route-1',
      routeFamilyId: 'route-family-1',
      revisionNo: 1,
      basedOnRouteId: '',
      isCurrentRevision: true,
      code: 'ROUTE-1',
      name: 'Test route',
      productId: '',
      productName: '',
      scopeType: 'BRANCH_DEFAULT',
      description: '',
      version: 1,
      status: 'PUBLISHED',
      createdAt: '',
      updatedAt: '',
      steps: [
        {
          id: 'route-step-first',
          routeId: 'route-1',
          sequence: 1,
          processStepId: 'operation-shared',
          processName: 'First operation',
          executionMode: 'IN_HOUSE',
          qualityGate: 'NONE',
          estimatedMinutes: 0,
          transferRequired: false,
          description: '',
        },
        {
          id: 'route-step-rework',
          routeId: 'route-1',
          sequence: 3,
          processStepId: 'operation-shared',
          processName: 'Rework operation',
          executionMode: 'IN_HOUSE',
          qualityGate: 'NONE',
          estimatedMinutes: 0,
          transferRequired: false,
          description: '',
        },
      ],
    }

    expect(
      resolveProductionExecutionLifecycleProcessName(
        [route],
        'route-1',
        'route-step-rework',
        'operation-shared'
      )
    ).toBe('3. Rework operation')
  })

  it('does not add payroll fields to production commands', () => {
    const command = buildProductionExecutionCommandInput({
      ...baseValues,
      action: 'COMPLETE',
    })
    expect(command).not.toHaveProperty('pieceworkAttribution')
    expect(command).not.toHaveProperty('quantity')
    expect(command).not.toHaveProperty('unitPrice')
  })

  it('keeps the selected execution context for the command service', () => {
    expect(
      buildProductionExecutionCommandInput({
        ...baseValues,
        captureMode: 'usb',
        action: 'REWORK',
        targetRouteStepId: 'route-step-2',
      })
    ).toMatchObject({
      productBarcode: ' BAR-001 ',
      source: 'hardware',
      action: 'REWORK',
      productionWorkLocationId: 'location-1',
      targetRouteStepId: 'route-step-2',
    })
  })
})
