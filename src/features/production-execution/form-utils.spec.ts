import { describe, expect, it } from 'vitest'
import {
  buildProductionExecutionCommandInput,
  resolveProductionExecutionCaptureSource,
  type ProductionExecutionFormValues,
} from './form-utils'

const baseValues: ProductionExecutionFormValues = {
  productBarcode: ' BAR-001 ',
  captureMode: 'manual',
  action: 'START',
  executionLotId: 'lot-1',
  routeId: 'route-1',
  routeStepId: 'route-step-1',
  processStepId: 'process-1',
  targetRouteStepId: '',
  targetProcessStepId: '',
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
          targetProcessStepId: 'old-rework-process',
        })
      ).toMatchObject({ targetRouteStepId: '', targetProcessStepId: '' })
    }
  })
  it('maps USB capture mode to the unified hardware source', () => {
    expect(resolveProductionExecutionCaptureSource('usb')).toBe('hardware')
    expect(resolveProductionExecutionCaptureSource('camera')).toBe('camera')
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
        targetProcessStepId: 'process-2',
      })
    ).toMatchObject({
      productBarcode: ' BAR-001 ',
      source: 'hardware',
      action: 'REWORK',
      routeId: 'route-1',
      routeStepId: 'route-step-1',
      processStepId: 'process-1',
      targetRouteStepId: 'route-step-2',
      targetProcessStepId: 'process-2',
    })
  })
})
