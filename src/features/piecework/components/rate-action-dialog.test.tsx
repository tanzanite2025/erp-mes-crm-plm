// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PieceworkRate } from '../data/schema'

const {
  selectDropdownMock,
  useProductDisplayOptionsMock,
  useDeltaTrackerMock,
} = vi.hoisted(() => ({
  selectDropdownMock: vi.fn(),
  useProductDisplayOptionsMock: vi.fn(),
  useDeltaTrackerMock: vi.fn(),
}))

vi.mock('@/components/action-dialog-shell', () => ({
  ActionDialogShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/action-dialog-shell.styles', () => ({
  buildActionDialogShellClasses: () => ({
    content: '',
    header: '',
    title: '',
    description: '',
    body: '',
    footer: '',
  }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}))

vi.mock('@/components/select-dropdown', () => ({
  SelectDropdown: (props: unknown) => {
    selectDropdownMock(props)
    return <div data-testid='select-dropdown' />
  },
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/features/engineering/hooks/use-product-display-options', () => ({
  useProductDisplayOptions: useProductDisplayOptionsMock,
}))

vi.mock('@/features/production-shared/tabs/hierarchy-config/hooks/use-hierarchy-level-labels', () => ({
  useHierarchyLevelLabels: () => ({
    level3Name: '工序',
  }),
}))

vi.mock('@/hooks/use-delta-tracker', () => ({
  useDeltaTracker: useDeltaTrackerMock,
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

import { RateActionDialog } from './rate-action-dialog'

describe('RateActionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useProductDisplayOptionsMock.mockReturnValue({
      productOptions: [
        {
          label: 'Road Rim (高刚性)',
          value: 'product-rim',
        },
      ],
      productDisplayLabelMap: new Map([['product-rim', 'Road Rim (高刚性)']]),
      products: [],
      isLoading: false,
    })
    useDeltaTrackerMock.mockImplementation((initialData: PieceworkRate) => ({
      data: structuredClone(initialData),
      tracker: {
        commit: vi.fn(),
      },
      isDirty: vi.fn().mockReturnValue(false),
    }))
  })

  it('uses shared authority product options for the piecework product dropdown', () => {
    render(
      <RateActionDialog
        open
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    expect(useProductDisplayOptionsMock).toHaveBeenCalledWith({ enabled: true })
    expect(selectDropdownMock).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          {
            label: 'Road Rim (高刚性)',
            value: 'product-rim',
          },
        ],
      }),
    )
  })
})
