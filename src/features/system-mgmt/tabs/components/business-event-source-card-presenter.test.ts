import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SALES_ORDER_EVENT_SOURCE } from '../../workflow-core/data/business-event-source-templates/sales-order'
import { getBusinessEventStatusLabel } from '../../workflow-core/data/business-event-status-catalog'
import { normalizeBusinessEventSource } from '../../workflow-core/data/business-event-source-normalizer'
import { cloneBusinessEventSource } from './business-event-source-card-utils'
import { buildBusinessEventSourceCardPresentation } from './business-event-source-card-presenter'

function createSource() {
  return normalizeBusinessEventSource({
    ...DEFAULT_SALES_ORDER_EVENT_SOURCE,
    id: 'source-1',
  })
}

describe('business-event-source-card-presenter', () => {
  it('returns stable summaries and no diff for an unchanged draft', () => {
    const committedSource = createSource()
    const draft = cloneBusinessEventSource(committedSource)

    const presentation = buildBusinessEventSourceCardPresentation({
      committedSource,
      draft,
    })

    expect(presentation.statusSummary).toBe('5 个唯一状态')
    expect(presentation.fieldSummary).toBe('4 字段 / 4 模板变量')
    expect(presentation.validationErrors).toEqual([])
    expect(presentation.diff.anyDirty).toBe(false)
    expect(presentation.changeOverviewSections).toEqual([])
    expect(presentation.removedActionItems).toEqual([])
    expect(presentation.removedStatusItems).toEqual([])
    expect(presentation.removedFieldItems).toEqual([])
    expect(presentation.removedResolverItems).toEqual([])
    expect(presentation.persistedActionIds.size).toBe(
      committedSource.config.actions.length
    )
  })

  it('builds change overview and removed summaries for dirty sections', () => {
    const committedSource = createSource()
    const draft = cloneBusinessEventSource(committedSource)
    const onOpenStatuses = vi.fn()

    draft.name = '销售订单 V2'
    draft.config.actions = draft.config.actions.slice(1)
    draft.config.statuses[1] = { ...draft.config.statuses[1], code: 'Reviewing' }

    const presentation = buildBusinessEventSourceCardPresentation({
      committedSource,
      draft,
      onOpenStatuses,
    })

    expect(presentation.diff.anyDirty).toBe(true)
    expect(
      presentation.changeOverviewSections.map((section) => section.title)
    ).toEqual(expect.arrayContaining(['基础配置', '动作', '状态']))
    expect(presentation.changeOverviewSections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          section: 'statuses',
          actionLabel: '展开',
          onOpen: onOpenStatuses,
        }),
      ])
    )
    expect(presentation.removedActionItems).toEqual([
      expect.objectContaining({
        code: 'CREATED',
        label: '新建',
      }),
    ])
    expect(presentation.changeOverviewSections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          section: 'general',
          items: expect.arrayContaining([
            expect.objectContaining({
              code: 'name',
              label: '名称',
            }),
          ]),
        }),
      ])
    )
    expect(
      presentation.changeOverviewSections.find((section) => section.section === 'statuses')?.items
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'Reviewing',
          label: getBusinessEventStatusLabel(draft.code, 'Reviewing'),
          meta: '唯一状态',
        }),
      ])
    )
  })
})
