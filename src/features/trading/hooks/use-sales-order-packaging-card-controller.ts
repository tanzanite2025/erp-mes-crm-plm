import { useState } from 'react'
import { usePackagingProfileFormController } from '@/features/logistics-config/hooks/use-packaging-profile-form-controller'
import type { PackagingProfile } from '@/features/logistics-config/packaging-rules-service'
import type { SalesOrder } from '../data/schema'
import { buildSalesOrderPackagingCardViewModel } from '../utils/sales-order-packaging-card-view-model'
import { useSalesOrderPackagingCardCommands } from './use-sales-order-packaging-card-commands'
import { useSalesOrderPackagingCardResources } from './use-sales-order-packaging-card-resources'

interface ActivePackagingRuleContext {
  order: SalesOrder
  lineNo: number
}

export function useSalesOrderPackagingCardController(orders: ReadonlyArray<SalesOrder>) {
  const resources = useSalesOrderPackagingCardResources(orders)
  const { persistLineSelection, isSelectionPending } = useSalesOrderPackagingCardCommands()
  const [activeRuleContext, setActiveRuleContext] = useState<ActivePackagingRuleContext | null>(null)

  const formController = usePackagingProfileFormController({
    onSaveSuccess: (saved) => {
      const context = activeRuleContext
      if (!context) {
        return
      }

      void persistLineSelection(context.order, context.lineNo, saved).finally(() => {
        setActiveRuleContext(null)
      })
    },
  })

  const getViewModel = (order: SalesOrder) =>
    buildSalesOrderPackagingCardViewModel({
      order,
      profiles: resources.profiles,
      profilesReady: resources.profilesReady,
      productOptionsReady: resources.productOptionsReady,
      weightMap: resources.weightMap,
      isLoading: resources.isLoading,
      isError: resources.isError,
      error: resources.error,
    })

  const startCreateRule = (order: SalesOrder, lineNo: number, productId?: string) => {
    if (!productId) {
      return
    }

    setActiveRuleContext({ order, lineNo })
    formController.handleCreate(productId)
  }

  const startEditRule = (profile: PackagingProfile) => {
    setActiveRuleContext(null)
    formController.handleEdit(profile)
  }

  return {
    getViewModel,
    persistLineSelection,
    startCreateRule,
    startEditRule,
    isSelectionPending,
    isFormSavePending: formController.savePending,
    formController,
  }
}

export type SalesOrderPackagingCardController = ReturnType<
  typeof useSalesOrderPackagingCardController
>
