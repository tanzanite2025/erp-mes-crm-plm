// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { dialogPropsSpy } = vi.hoisted(() => ({
  dialogPropsSpy: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: string, params?: Record<string, unknown>) => {
      if (!params) return key
      return `${key}:${JSON.stringify(params)}`
    },
  }),
}))

vi.mock('./product-binding-history-dialog', () => ({
  ProductBindingHistoryDialog: (props: {
    prefetchRecordCount?: boolean
    renderTrigger?: (context: { open: boolean; setOpen: (open: boolean) => void; recordCount: number }) => React.ReactElement
  }) => {
    dialogPropsSpy(props)
    return props.renderTrigger
      ? props.renderTrigger({
          open: true,
          setOpen: vi.fn(),
          recordCount: 12,
        })
      : null
  },
}))

import {
  HistoryBadgeTrigger,
  HistoryCardTrigger,
  HistoryTableActionTrigger,
} from './product-binding-history-trigger-presets'

describe('product-binding-history-trigger-presets', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders badge trigger label and record count through shared dialog preset', () => {
    render(<HistoryBadgeTrigger label='历史记录' />)

    expect(screen.getByRole('button', { name: /历史记录/i })).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
    expect(dialogPropsSpy).toHaveBeenCalled()
  })

  it('renders card trigger description with recordCount fallback', () => {
    render(<HistoryCardTrigger />)

    expect(screen.getByText('cuttingOperations.productBinding.history.title')).toBeTruthy()
    expect(
      screen.getByText(
        'cuttingOperations.productBinding.history.description:{"count":12}'
      )
    ).toBeTruthy()
  })

  it('passes prefetchRecordCount when table action trigger needs count', () => {
    render(<HistoryTableActionTrigger showCount />)

    expect(screen.getByText('12')).toBeTruthy()
    expect(dialogPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        prefetchRecordCount: true,
      })
    )
  })

  it('does not show count badge or prefetch count when showCount is false', () => {
    render(<HistoryTableActionTrigger />)

    expect(screen.queryByText('12')).toBeNull()
    expect(dialogPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        prefetchRecordCount: false,
      })
    )
  })
})
