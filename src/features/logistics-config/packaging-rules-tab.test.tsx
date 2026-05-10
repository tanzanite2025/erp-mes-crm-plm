// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const {
  getProfilesMock,
  handleCreateMock,
  handleEditMock,
} = vi.hoisted(() => ({
  getProfilesMock: vi.fn(),
  handleCreateMock: vi.fn(),
  handleEditMock: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'zh-CN',
  }),
}))

vi.mock('./hooks/use-packaging-profile-form-controller', () => ({
  usePackagingProfileFormController: () => ({
    open: false,
    setOpen: vi.fn(),
    draft: {
      id: undefined,
      code: '',
      name: '',
      packagingType: '',
      length: 0,
      width: 0,
      height: 0,
      dimensionUnitCode: '',
      netWeight: 0,
      grossWeight: 0,
      weightUnitCode: '',
      capacity: 0,
      capacityUnitCode: '',
      assemblySource: '',
      isActive: true,
      notes: '',
      targets: [],
    },
    setDraft: vi.fn(),
    products: [],
    packagingMaterials: [],
    packagingMaterialOptions: [],
    dimensionUnits: [],
    weightUnits: [],
    quantityUnits: [],
    resolvedDimensionUnitCode: '',
    resolvedWeightUnitCode: '',
    resolvedCapacityUnitCode: '',
    selectedPackagingMaterialId: '',
    selectedProduct: null,
    computedVolume: 0,
    computedGrossWeight: 0,
    packagingMaterialsLoading: false,
    savePending: false,
    handleCreate: handleCreateMock,
    handleEdit: handleEditMock,
    handleSave: vi.fn(),
    updateSelectedPackagingMaterial: vi.fn(),
    updateSelectedProduct: vi.fn(),
    isLoading: false,
  }),
}))

vi.mock('./components/packaging-profile-form-dialog', () => ({
  PackagingProfileFormDialog: () => <div data-testid='packaging-profile-form-dialog' />,
}))

vi.mock('./packaging-rules-service', () => ({
  packagingRulesService: {
    getProfiles: getProfilesMock,
    deleteProfile: vi.fn(),
  },
}))

import { LogisticsPackagingRulesTab } from './packaging-rules-tab'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('LogisticsPackagingRulesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProfilesMock.mockResolvedValue([
      {
        id: 'profile-1',
        code: 'PK-001',
        name: 'Box A',
        packagingType: 'carton',
        length: 10,
        width: 5,
        height: 4,
        dimensionUnitCode: 'cm',
        netWeight: 1,
        grossWeight: 2,
        weightUnitCode: 'kg',
        capacity: 10,
        capacityUnitCode: 'pcs',
        assemblySource: '',
        isActive: true,
        notes: '',
        targets: [
          {
            entityType: 'product',
            entityId: 'product-1',
            entityName: 'Product A',
            isDefault: true,
            sortOrder: 0,
          },
        ],
      },
    ])
  })

  it('reuses shared form controller for add and edit actions', async () => {
    const user = userEvent.setup()
    const queryClient = createQueryClient()

    render(<LogisticsPackagingRulesTab />, {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(screen.getByText('Box A')).toBeTruthy()
    })

    await user.click(
      screen.getByRole('button', {
        name: 'logisticsConfig.packagingRules.addRule',
      })
    )
    expect(handleCreateMock).toHaveBeenCalledTimes(1)

    await user.click(
      screen.getByRole('button', {
        name: 'logisticsConfig.packagingRules.edit',
      })
    )
    expect(handleEditMock).toHaveBeenCalledTimes(1)
    expect(handleEditMock.mock.calls[0]?.[0]?.id).toBe('profile-1')
  })
})
