// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { deserializeBusinessEventSource } from '../../workflow-core/data/business-event-source-schema'
import { DEFAULT_QUALITY_STANDARD_EVENT_SOURCE } from '../../workflow-core/data/business-event-source-templates/quality-standard'
import { serializeNotificationRule } from '../../workflow-core/data/notification-rule-schema'
import { createStatusSegment, normalizeSegment } from './rule-card-model'
import { RuleStatusRow } from './rule-status-row'

vi.mock('./rule-template-panel', () => ({ RuleTemplatePanel: () => null }))

describe('quality notification listeners and approval ownership', () => {
  afterEach(cleanup)

  it('creates and serializes a quality listener without embedded approval configuration', () => {
    const source = deserializeBusinessEventSource({
      ...DEFAULT_QUALITY_STANDARD_EVENT_SOURCE,
      id: 'source',
    })
    const segment = normalizeSegment(
      createStatusSegment(source.config.statuses[1], source)
    )
    const payload = serializeNotificationRule({
      name: '品质通知',
      enabled: true,
      sourceCode: source.code,
      entity: 'QUALITY',
      actionCode: 'STATUS_CHANGED',
      version: 1,
      segments: [segment],
    })
    expect(JSON.parse(JSON.stringify(payload)).segments[0]).not.toHaveProperty(
      'approval'
    )
  })

  it('keeps notification recipients editable without approval controls', () => {
    const source = deserializeBusinessEventSource({
      ...DEFAULT_QUALITY_STANDARD_EVENT_SOURCE,
      id: 'source',
    })
    const status = source.config.statuses[1]
    const segment = createStatusSegment(status, source)
    render(
      <RuleStatusRow
        status={status}
        segment={segment}
        completeness={{ label: '缺模板', tone: 'warning' }}
        sourceName='品质标准'
        sourceCode='QUALITY_STANDARD'
        actionCode='STATUS_CHANGED'
        users={[]}
        commands={[]}
        resolverOptions={[]}
        showAdvanced={true}
        onToggle={vi.fn()}
        onAddNotifyUser={vi.fn()}
        onRemoveNotifyUser={vi.fn()}
        onCommandChange={vi.fn()}
        onCreateTemplate={vi.fn()}
        onDuplicateTemplate={vi.fn()}
        onDynamicNotifyChange={vi.fn()}
        onApprovalUserChange={vi.fn()}
        onApprovalDynamicChange={vi.fn()}
      />
    )
    expect(screen.queryByText('是否需要审批')).toBeNull()
    expect(screen.queryByText('动态审批人')).toBeNull()
    expect(screen.getByText('添加通知账号')).toBeTruthy()
  })
})
