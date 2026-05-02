'use client'

import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ProductActionDialog } from '@/features/engineering/components/product-action-dialog'
import { type Product, type ProductType } from '@/features/engineering/data/schema'
import { type ProductSubmitPayload } from '@/features/engineering/hooks/use-product-form'
import { useProductWriteActions } from '@/features/engineering/hooks/use-product-write-actions'
import { PRODUCT_TYPES_QUERY_KEY } from '@/features/engineering/query-keys'
import { ProductTypeService } from '@/features/engineering/services/product-type-service'
import { MaterialUpsertDialog } from '@/features/material-archive/components/material-upsert-dialog'
import { type Material } from '@/features/material-archive/data/schema'
import { MATERIAL_OPTIONS_QUERY_KEY } from '@/features/material-archive/query-keys'
import { MaterialMaintenanceService } from '@/features/material-archive/services/material-maintenance-service'
import { EmployeeActionDialog } from '@/features/org-personnel/components/employee-action-dialog'
import { type Employee } from '@/features/org-personnel/data/schema'
import { personnelQueryKeys } from '@/features/org-personnel/query-keys'
import { EmployeeMaintenanceService } from '@/features/org-personnel/services/employee-maintenance-service'
import { CustomerActionDialog } from '@/features/trading/components/customer-action-dialog'
import { SalesOrderActionDialog } from '@/features/trading/components/sales-order-action-dialog'
import { type Customer, type CustomerFormValues, type SalesOrder } from '@/features/trading/data/schema'
import { useCustomerMutations } from '@/features/trading/customer'
import { ProductInboundActionDialog } from '@/features/warehouse/components/product-inbound-action-dialog'
import { type InboundRecord } from '@/features/warehouse/inventory'
import { useSearch } from '@/context/search-provider'
import { createLogger } from '@/lib/logger'
import { type DeltaSet } from '@/lib/delta/types'
import {
  getHostedQuickActionDefinition,
  type HostedQuickActionId,
} from './layout/data/quick-action-registry'

const logger = createLogger('QuickActionHost')

type QuickActionHostProps = {
  actionId: HostedQuickActionId | null
  onActionChange: (actionId: HostedQuickActionId | null) => void
  onSearchReset: () => void
}

type QuickActionResult =
  | { status: 'cancelled' }
  | { status: 'failed'; error?: unknown }
  | { status: 'success'; navigate?: () => void }

export function QuickActionHost({
  actionId,
  onActionChange,
  onSearchReset,
}: QuickActionHostProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setOpen } = useSearch()
  const { saveProducts } = useProductWriteActions()
  const { createMutation: createCustomerMutation } = useCustomerMutations()
  const [isProductDialogReady, setIsProductDialogReady] = React.useState(false)

  const activeDefinition = actionId
    ? getHostedQuickActionDefinition(actionId)
    : undefined
  const isProductActionActive = actionId === 'action-add-product'

  const productTypesQuery = useQuery({
    queryKey: PRODUCT_TYPES_QUERY_KEY,
    queryFn: () => ProductTypeService.getProductTypes(),
    enabled: isProductActionActive,
  })

  const { mutateAsync: createMaterial } = useMutation({
    mutationFn: async ({ data }: { data: Material }) => {
      return MaterialMaintenanceService.saveMaterial(data)
    },
  })

  const { mutateAsync: createEmployee } = useMutation({
    mutationFn: async (data: Employee) => {
      return EmployeeMaintenanceService.saveEmployee(data)
    },
  })

  const completeAction = React.useCallback(
    (result: QuickActionResult) => {
      if (result.status === 'cancelled') {
        onActionChange(null)
        return
      }

      if (result.status === 'failed') {
        if (result.error) {
          logger.error('Quick action failed', result.error)
        }
        return
      }

      onActionChange(null)
      onSearchReset()
      setOpen(false)
      result.navigate?.()
    },
    [onActionChange, onSearchReset, setOpen]
  )

  React.useEffect(() => {
    if (activeDefinition?.hostKind !== 'product-create') {
      setIsProductDialogReady(false)
      return
    }

    if (productTypesQuery.isSuccess) {
      setIsProductDialogReady(true)
      return
    }

    if (productTypesQuery.isError) {
      logger.error('Load product types for quick action failed', productTypesQuery.error)
      toast.error('产品类型加载失败')
      completeAction({ status: 'failed', error: productTypesQuery.error })
      onActionChange(null)
      return
    }

    setIsProductDialogReady(false)
  }, [
    activeDefinition?.hostKind,
    completeAction,
    onActionChange,
    productTypesQuery.error,
    productTypesQuery.isError,
    productTypesQuery.isSuccess,
  ])

  const handleHostedDialogOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        completeAction({ status: 'cancelled' })
      }
    },
    [completeAction]
  )

  const handleMaterialCreate = React.useCallback(
    async (data: Material, _isPatch?: boolean, _delta?: DeltaSet) => {
      const savedMaterial = await createMaterial({ data })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['material-archive'] }),
        queryClient.invalidateQueries({ queryKey: MATERIAL_OPTIONS_QUERY_KEY }),
      ])
      toast.success('物料档案已保存')
      completeAction({
        status: 'success',
        navigate: () => {
          navigate({
            to: '/materials/$category',
            params: { category: savedMaterial.category || 'RAW_MATERIAL' },
          })
        },
      })
    },
    [completeAction, createMaterial, navigate, queryClient]
  )

  const handleProductCreate = React.useCallback(
    async (payload: ProductSubmitPayload) => {
      if (payload.products.length === 0) {
        return undefined
      }

      return saveProducts(
        payload.products.map((product) => ({
          data: product,
          currentRow: payload.currentRow,
        }))
      )
    },
    [saveProducts]
  )

  const handleProductCreated = React.useCallback(
    (_savedProducts: Product[]) => {
      completeAction({
        status: 'success',
        navigate: () => {
          navigate({ to: '/engineering/products' })
        },
      })
    },
    [completeAction, navigate]
  )

  const handleInboundSubmitted = React.useCallback(
    (_savedRecord: InboundRecord) => {
      completeAction({
        status: 'success',
        navigate: () => {
          navigate({ to: '/warehouse/inbound' })
        },
      })
    },
    [completeAction, navigate]
  )

  const handleCustomerCreate = React.useCallback(
    async (payload: {
      data: Customer | CustomerFormValues
      isPatch: boolean
      delta?: DeltaSet
    }) => {
      if (payload.isPatch) {
        return undefined
      }

      return createCustomerMutation.mutateAsync(payload.data as CustomerFormValues)
    },
    [createCustomerMutation]
  )

  const handleCustomerCreated = React.useCallback(
    (_savedCustomer: Customer) => {
      completeAction({
        status: 'success',
        navigate: () => {
          navigate({ to: '/trading/customers' })
        },
      })
    },
    [completeAction, navigate]
  )

  const handleEmployeeCreate = React.useCallback(
    async (data: Employee, isPatch?: boolean, _delta?: DeltaSet) => {
      if (isPatch) {
        return undefined
      }

      const savedEmployee = await createEmployee(data)
      await queryClient.invalidateQueries({ queryKey: personnelQueryKeys.employees() })
      return savedEmployee
    },
    [createEmployee, queryClient]
  )

  const handleEmployeeCreated = React.useCallback(
    (_savedEmployee: Employee) => {
      completeAction({
        status: 'success',
        navigate: () => {
          navigate({ to: '/personnel/employees' })
        },
      })
    },
    [completeAction, navigate]
  )

  const handleSalesOrderCreated = React.useCallback(
    (savedOrder: SalesOrder) => {
      completeAction({
        status: 'success',
        navigate: () => {
          navigate({
            to: '/trading/sales-orders',
            search: (prev) => ({
              ...prev,
              detailId: savedOrder.id,
            }),
          })
        },
      })
    },
    [completeAction, navigate]
  )

  if (!activeDefinition) {
    return null
  }

  return (
    <>
      <MaterialUpsertDialog
        open={actionId === 'action-add-material'}
        onOpenChange={handleHostedDialogOpenChange}
        material={null}
        onSave={handleMaterialCreate}
      />
      <ProductActionDialog
        open={actionId === 'action-add-product' && isProductDialogReady}
        onOpenChange={handleHostedDialogOpenChange}
        currentRow={undefined}
        onSubmit={handleProductCreate}
        onSaved={handleProductCreated}
        productTypes={(productTypesQuery.data as ProductType[] | undefined) ?? []}
      />
      <ProductInboundActionDialog
        open={actionId === 'action-inbound'}
        onOpenChange={handleHostedDialogOpenChange}
        onSubmitted={handleInboundSubmitted}
      />
      <CustomerActionDialog
        open={actionId === 'action-add-customer'}
        onOpenChange={handleHostedDialogOpenChange}
        customer={null}
        onSave={handleCustomerCreate}
        onSaved={handleCustomerCreated}
      />
      <EmployeeActionDialog
        open={actionId === 'action-add-employee'}
        onOpenChange={handleHostedDialogOpenChange}
        currentRow={undefined}
        onSubmit={handleEmployeeCreate}
        onSaved={handleEmployeeCreated}
      />
      <SalesOrderActionDialog
        open={actionId === 'action-create-sales-order'}
        onOpenChange={handleHostedDialogOpenChange}
        order={null}
        onSaved={handleSalesOrderCreated}
      />
    </>
  )
}
