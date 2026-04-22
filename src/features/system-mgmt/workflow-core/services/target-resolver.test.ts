import { describe, expect, it } from 'vitest'
import { getTargetEntity, getTargetSourceCode } from './target-resolver'

describe('target-resolver production task mapping', () => {
  it('maps TASK_ASSIGNED events to the PRODUCTION_TASK system event source', () => {
    expect(getTargetEntity('TASK_ASSIGNED')).toBe('SYSTEM')
    expect(
      getTargetSourceCode({
        type: 'TASK_ASSIGNED',
      })
    ).toBe('PRODUCTION_TASK')
  })
})
