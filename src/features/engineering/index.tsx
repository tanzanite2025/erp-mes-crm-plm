'use client'

import { Box } from 'lucide-react'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { isForbiddenError } from '@/lib/error-status'
import { CategoryManagerDialog } from './components/category-manager-dialog'
import { EngineeringWorkspaceEmptyState } from './components/engineering-workspace-empty-state'
import { EngineeringWorkspaceLoadingState } from './components/engineering-workspace-loading-state'
import { EngineeringSidebar } from './components/engineering-sidebar'
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
        <div className='flex flex-col gap-4 sm:gap-8 px-4 pb-6 pt-0 md:px-6 animate-in fade-in duration-700'>
            <IndustrialHeader
                icon={Box}
                title={t('engineering.productMgmt.pageTitle')}
                description={t('engineering.productMgmt.pageDescription')}
            />

            <div className='flex justify-end'>
                <AuditTimelineTriggerButton
                    module={AUDIT_MODULES.product}
                    targetName={t('engineering.productMgmt.pageTitle')}
                    label={t('common.audit.trigger')}
                />
            </div>

            <div className='flex flex-col lg:flex-row flex-1 overflow-hidden min-h-[600px] rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-1 gap-1'>
                <EngineeringSidebar
                    products={vm.products}
                    types={vm.types}
                    selectedProductId={vm.effectiveSelectedProductId}
                    onSelectProduct={vm.handleSelectProduct}
                    onAddProduct={vm.handleAddProduct}
                    onEditProduct={vm.handleEditProduct}
                    onAddType={vm.handleOpenTypeDialog}
                />

                <div className='p-0 flex-1 overflow-hidden relative bg-background rounded-[24px] lg:rounded-l-none lg:rounded-r-[32px] flex flex-col'>
                    {vm.isLoading ? (
                        <EngineeringWorkspaceLoadingState />
                    ) : vm.selectedProduct ? (
                        <div className='p-4 sm:p-8 mx-auto w-full overflow-y-auto'>
                            <ProductOverviewTab product={vm.selectedProduct} productTypes={vm.types} onEdit={vm.handleEditProduct} />
                        </div>
                    ) : (
                        <EngineeringWorkspaceEmptyState onInitializeProject={vm.handleAddProduct} />
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

            <CategoryManagerDialog open={vm.isTypeDialogOpen} onOpenChange={vm.handleTypeDialogOpenChange} productTypes={vm.types} />
        </div>
    )
}
