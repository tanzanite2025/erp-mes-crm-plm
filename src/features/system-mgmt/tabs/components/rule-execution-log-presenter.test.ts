import { describe, expect, it } from 'vitest'
import {
  getExecutionStatusBadgeClass,
  getExecutionStatusLabel,
  isConfigurationPendingLog,
  shouldHideExecutionLogByDefault,
} from './rule-execution-log-presenter'

describe('rule-execution-log-presenter', () => {
  it('treats notify skipped logs without bound template as configuration pending', () => {
    const log = {
      executionType: 'notify',
      executionStatus: 'skipped',
      errorMessage: '当前规则未绑定通知内容模板，系统也没有可用的默认通知正文。',
    } as const

    expect(isConfigurationPendingLog(log)).toBe(true)
    expect(shouldHideExecutionLogByDefault({ ...log } as never)).toBe(true)
    expect(getExecutionStatusLabel('skipped', log)).toBe('待配置')
    expect(getExecutionStatusBadgeClass('skipped', log)).toBe(
      'border-none bg-slate-200 text-slate-700'
    )
  })

  it('keeps normal skipped logs as skipped', () => {
    const log = {
      executionType: 'approval',
      executionStatus: 'skipped',
      errorMessage: '',
    } as const

    expect(isConfigurationPendingLog(log)).toBe(false)
    expect(getExecutionStatusLabel('skipped', log)).toBe('跳过')
    expect(getExecutionStatusBadgeClass('skipped', log)).toBe(
      'border-none bg-amber-100 text-amber-700'
    )
  })
})
