import { describe, expect, it } from 'vitest'
import {
  cleanActionTags,
  parseActionTags,
  parseAllActionItems,
} from './tag-parser'

describe('AI tag parser', () => {
  it('only exposes ACT buttons for known application routes', () => {
    const actions = parseActionTags(
      [
        '[ACT: 打开 AI 能力 | /system-management/ai-capability]',
        '[ACT: 打开旧入口 | /system-mgmt/users]',
        '[ACT: 打开外部链接 | https://example.com/system-management]',
      ].join('\n')
    )

    expect(actions).toEqual([
      {
        label: '打开 AI 能力',
        value: '/system-management/ai-capability',
        type: 'ACT',
      },
    ])
  })

  it('keeps unsafe protocol tags out of rendered markdown actions', () => {
    const text =
      '建议处理 [ACT: 外部 | https://example.com] [CMD: 递归 | [ACT: 打开 | /system-management]]'

    expect(parseAllActionItems(text)).toEqual([])
    expect(cleanActionTags(text)).toBe('建议处理')
  })
})
