'use client'

import { Box } from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { CategoryManagerDialog } from './components/category-manager-dialog'
import { EngineeringSidebar } from './components/engineering-sidebar'
import { EngineeringWorkspaceEmptyState } from './components/engineering-workspace-empty-state'
import { EngineeringWorkspaceLoadingState } from './components/engineering-workspace-loading-state'
import { ProductActionDialog } from './components/product-action-dialog'
import { ProductOverviewTab } from './components/product-overview-tab'
import { useEngineeringWorkspaceViewModel } from './hooks/use-engineering-workspace-view-model'

export function Engineering() {
  const { t } = useLanguage()
  const vm = useEngineeringWorkspaceViewModel()

  if (isForbiddenError(vm.error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-3 pt-0 pb-5 duration-700 fade-in sm:gap-4'>
      <IndustrialHeader
        icon={Box}
        title={t('engineering.productMgmt.pageTitle')}
        description={t('engineering.productMgmt.pageDescription')}
        statusBadge={
          <AuditTimelineTriggerButton
            module={AUDIT_MODULES.product}
            targetName={t('engineering.productMgmt.pageTitle')}
            label={t('common.audit.trigger')}
            className='h-10 rounded-full px-4'
          />
        }
      />

      <div className='flex min-h-[540px] flex-1 flex-col gap-0.5 overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-0.5 lg:flex-row'>
        <EngineeringSidebar
          products={vm.products}
          types={vm.types}
          productDisplayMetadataMap={vm.productDisplayMetadataMap}
          productOwnersMap={vm.productOwnersMap}
          selectedProductId={vm.effectiveSelectedProductId}
          onSelectProduct={vm.handleSelectProduct}
          onAddProduct={vm.handleAddProduct}
          onEditProduct={vm.handleEditProduct}
          onAddType={vm.handleOpenTypeDialog}
        />

        <div className='relative flex flex-1 flex-col overflow-hidden rounded-[24px] bg-background p-0 lg:basis-1/2 lg:rounded-l-none lg:rounded-r-[32px]'>
          {vm.isLoading ? (
            <EngineeringWorkspaceLoadingState />
          ) : vm.selectedProduct ? (
            <div className='mx-auto w-full overflow-y-auto p-2.5 sm:p-4'>
              <ProductOverviewTab
                product={vm.selectedProduct}
                productTypes={vm.types}
                displayMetadata={vm.selectedProductDisplayMetadata}
                onEdit={vm.handleEditProduct}
              />
            </div>
          ) : (
            <EngineeringWorkspaceEmptyState
              onInitializeProject={vm.handleAddProduct}
            />
          )}
        </div>
      </div>

      <ProductActionDialog
        open={vm.isProductDialogOpen}
        onOpenChange={vm.handleProductDialogOpenChange}
        currentRow={vm.editingProduct}
        onSubmit={vm.handleProductSubmit}
        productTypes={vm.types}
      />

      <CategoryManagerDialog
        open={vm.isTypeDialogOpen}
        onOpenChange={vm.handleTypeDialogOpenChange}
        productTypes={vm.types}
      />
    </div>
  )
}
