'use client'

import { useEffect } from 'react'
import { TrendingDown } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { Route } from '@/routes/_authenticated/warehouse/shipment'
import { useLanguage } from '@/context/language-provider'
import { PageHeader } from '@/components/layout/page-header'
import { isForbiddenError } from '@/lib/error-status'
import { ShipmentDemandBoard, ShipmentDialog, ShipmentHistory, ShipmentSearch, useShipment } from '../shipment'

export default function ProductShipment() {
    const { t } = useLanguage()
    const {
        searchQuery,
        setSearchQuery,
        searchResults,
        history,
        shipmentDemands,
        error,
        isSearching,
        selectedItem,
        formMode,
        isShipmentOpen,
        setIsShipmentOpen,
        warehouseCategories,
        masterDataMap,
        activeTab,
        setActiveTab,
        formData,
        setFormData,
        openShipmentForm,
        openVirtualLockForm,
        submitShipment,
        commitDraft,
        removeRecord,
        categoryStock,
        inventoryBreakdown,
        alertThresholds,
        salesOrders
    } = useShipment()
    const { mode, viewId } = Route.useSearch()

    useEffect(() => {
        if (viewId) {
            setActiveTab('all')
        }
    }, [viewId, setActiveTab])

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            <PageHeader title={t('warehouse.shipment.title')} description={t('warehouse.shipment.subtitle')} icon={TrendingDown}>
                <div className='flex items-center gap-2 md:gap-3 bg-blue-500/5 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-dashed border-blue-500/20 shadow-inner shrink-0 self-start sm:self-auto'>
                        <div className='size-1.5 md:size-2 rounded-full bg-blue-500 animate-pulse' />
                        <span className='text-[8px] md:text-[10px] font-black uppercase tracking-widest text-blue-600'>{t('warehouse.shipment.realtimeSync')}</span>
                </div>
            </PageHeader>

            <ShipmentDemandBoard
                demands={shipmentDemands}
                warehouseCategories={warehouseCategories}
                onPrepare={openVirtualLockForm}
            />

            <ShipmentSearch
                searchQuery={searchQuery}
                autoFocus={mode === 'scan'}
                setSearchQuery={setSearchQuery}
                isSearching={isSearching}
                searchResults={searchResults}
                onSelect={openShipmentForm}
            />

            <ShipmentHistory
                history={history}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                masterDataMap={masterDataMap}
                warehouseCategories={warehouseCategories}
                onCommit={commitDraft}
                onRemove={removeRecord}
                highlightId={viewId}
            />

            <ShipmentDialog
                open={isShipmentOpen}
                onOpenChange={setIsShipmentOpen}
                selectedItem={selectedItem}
                formData={formData}
                setFormData={setFormData}
                warehouseCategories={warehouseCategories}
                formMode={formMode}
                onSubmit={submitShipment}
                categoryStock={categoryStock ?? 0}
                inventoryBreakdown={inventoryBreakdown ?? {}}
                alertThreshold={selectedItem ? alertThresholds[selectedItem.id] : 0}
                salesOrders={salesOrders}
            />
        </div>
    )
}
