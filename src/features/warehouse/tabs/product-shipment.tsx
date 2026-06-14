'use client'

import { useEffect } from 'react'
import { Route } from '@/routes/_authenticated/warehouse/shipment'
import { AlertTriangle, RefreshCw, TrendingDown } from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import {
  ShipmentDemandBoard,
  ShipmentDialog,
  ShipmentHistory,
  ShipmentSearch,
  useShipment,
} from '../shipment'

export default function ProductShipment() {
  const { t } = useLanguage()
  const {
    readResource,
    searchQuery,
    setSearchQuery,
    searchResource,
    retrySearch,
    selectedItem,
    formMode,
    isShipmentOpen,
    setIsShipmentOpen,
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    openShipmentForm,
    openVirtualLockForm,
    submitShipment,
    commitDraft,
    removeRecord,
    inventoryContextResource,
    retryRead,
    retryInventoryContext,
  } = useShipment()
  const { mode, viewId } = Route.useSearch()

  useEffect(() => {
    if (viewId) {
      setActiveTab('all')
    }
  }, [viewId, setActiveTab])

  if (readResource.status === 'error' && isForbiddenError(readResource.error)) {
    return <ForbiddenState />
  }

  if (readResource.status === 'error') {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <IndustrialHeader
          title={t('warehouse.shipment.title')}
          description={t('warehouse.shipment.subtitle')}
          icon={TrendingDown}
        />

        <div className='flex flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-200 bg-rose-50/60 px-6 py-14 text-center'>
          <AlertTriangle className='mb-4 size-10 text-rose-500' />
          <p className='text-sm font-black tracking-widest text-foreground'>
            {t('warehouse.shipment.title')}
          </p>
          <p className='mt-2 text-[11px] font-bold text-muted-foreground'>
            {readResource.error.message}
          </p>
          <Button
            type='button'
            variant='outline'
            className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black tracking-widest uppercase'
            onClick={() => {
              void retryRead()
            }}
          >
            重试
          </Button>
        </div>
      </div>
    )
  }

  if (readResource.status === 'loading') {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <IndustrialHeader
          title={t('warehouse.shipment.title')}
          description={t('warehouse.shipment.subtitle')}
          icon={TrendingDown}
        />

        <div className='flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-dashed border-muted/40 bg-muted/5 px-6 py-14 text-center'>
          <RefreshCw className='mb-4 size-10 animate-spin text-primary/40' />
          <p className='text-sm font-black tracking-widest text-foreground'>
            {t('warehouse.shipment.title')}
          </p>
          <p className='mt-2 text-[11px] font-bold text-muted-foreground'>
            {t('warehouse.shipment.subtitle')}
          </p>
        </div>
      </div>
    )
  }

  const shipmentDemands = readResource.shipmentDemands
  const warehouseCategories = readResource.warehouseCategories
  const history = readResource.history
  const masterDataMap = readResource.masterDataMap
  const materialThresholdMap = readResource.materialThresholdMap
  const salesOrders = readResource.salesOrders

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        title={t('warehouse.shipment.title')}
        description={t('warehouse.shipment.subtitle')}
        icon={TrendingDown}
      />

      <div className='flex justify-end'>
        <AuditTimelineTriggerButton
          module={AUDIT_MODULES.shipment}
          targetName={t('warehouse.shipment.title')}
          label={t('common.audit.trigger')}
          className='h-10 rounded-full px-4 md:h-11 md:px-5'
        />
      </div>

      <ShipmentDemandBoard
        demands={shipmentDemands}
        warehouseCategories={warehouseCategories}
        onPrepare={openVirtualLockForm}
      />

      <ShipmentSearch
        searchQuery={searchQuery}
        autoFocus={mode === 'scan'}
        setSearchQuery={setSearchQuery}
        searchResource={searchResource}
        onRetry={() => {
          void retrySearch()
        }}
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
        inventoryContextResource={inventoryContextResource}
        onRetryInventoryContext={() => {
          void retryInventoryContext()
        }}
        materialThreshold={
          selectedItem ? materialThresholdMap[selectedItem.id] : 0
        }
        salesOrders={salesOrders}
      />
    </div>
  )
}
