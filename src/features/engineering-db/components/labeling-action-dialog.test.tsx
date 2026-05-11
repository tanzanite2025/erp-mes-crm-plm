// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LabelingDraftInput } from '../data/schema'

const {
  selectDropdownMock,
  useEngineeringDbProductDisplayOptionsMock,
  useDeltaTrackerMock,
} = vi.hoisted(() => ({
  selectDropdownMock: vi.fn(),
  useEngineeringDbProductDisplayOptionsMock: vi.fn(),
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

vi.mock('@/components/file-uploader', () => ({
  FileUploader: () => <div data-testid='file-uploader' />,
}))

vi.mock('@/hooks/use-delta-tracker', () => ({
  useDeltaTracker: useDeltaTrackerMock,
}))

vi.mock('../hooks/use-engineering-db-product-display-options', () => ({
  useEngineeringDbProductDisplayOptions: useEngineeringDbProductDisplayOptionsMock,
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

import { LabelingActionDialog } from './labeling-action-dialog'

describe('LabelingActionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEngineeringDbProductDisplayOptionsMock.mockReturnValue({
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
    useDeltaTrackerMock.mockImplementation((initialData: LabelingDraftInput & { id?: string; createdAt?: string }) => ({
      data: structuredClone(initialData),
      tracker: {
        commit: vi.fn(),
      },
      isDirty: vi.fn().mockReturnValue(false),
    }))
  })

  it('uses engineering-db authority product options for target product dropdown while preserving generic option', () => {
    render(
      <LabelingActionDialog
        open
        onOpenChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(useEngineeringDbProductDisplayOptionsMock).toHaveBeenCalledWith({ enabled: true })
    expect(selectDropdownMock).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.arrayContaining([
          {
            label: '-- 通用方案 / Generic --',
            value: 'generic',
          },
          {
            label: 'Road Rim (高刚性)',
            value: 'product-rim',
          },
        ]),
      }),
    )
  })
})
