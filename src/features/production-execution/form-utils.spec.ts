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
  partnerId: '',
  result: '',
  notes: 'begin',
  fromHolderType: '',
  fromHolderId: '',
  toHolderType: '',
  toHolderId: '',
}

describe('production execution form utils', () => {
  it('maps USB capture mode to the unified hardware source', () => {
    expect(resolveProductionExecutionCaptureSource('usb')).toBe('hardware')
    expect(resolveProductionExecutionCaptureSource('camera')).toBe('camera')
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
