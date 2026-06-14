'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Accordion } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ForbiddenState } from '@/components/forbidden-state'
import { financeQueryKeys } from '@/features/finance/query-keys'
import { CurrencyCoreService } from '@/features/finance/services/currency-core-service'
import { BOMAlertDetailsDialog } from '../components/bom-alert-details-dialog'
import { StockMgmtCategorySection } from '../components/stock-mgmt-category-section'
import { StockMgmtHeader } from '../components/stock-mgmt-header'
import { StockMgmtToolbar } from '../components/stock-mgmt-toolbar'
import { useStockMgmt } from '../hooks/use-stock-mgmt'
import { MaterialThresholdDialog } from '../material-thresholds/components/material-threshold-dialog'

export default function StockMgmt() {
  const { t } = useLanguage()
  const [bomAlertDetailsOpen, setBomAlertDetailsOpen] = useState(false)
  const baseCurrencyQuery = useQuery({
    queryKey: [...financeQueryKeys.currencies(), 'base'],
    queryFn: () => CurrencyCoreService.getBaseCurrency(),
  })
  const baseCurrency = baseCurrencyQuery.data
  const {
    readResource,
    stockData,
    filters,
    thresholdDialog,
    reconcileDialog,
    retryRead,
  } = useStockMgmt()
  const {
    groupedInventory,
    materialTotalStock,
    materialThresholdMap,
    categories,
    alertCount,
    materialAlertCount,
    bomAlertCount,
    totalAssetsValue,
  } = stockData
  const { searchTerm, setSearchTerm, hideZeroStockMap, setHideZeroStockMap } =
    filters
  const {
    open: configDialogOpen,
    selectedMaterial,
    selectedThresholdRule,
    selectedMaterialOptions,
    canManageThresholdRule,
    isSubmitting: isSavingThresholdRule,
    onOpenChange: handleThresholdDialogOpenChange,
    onSubmit: handleSaveThresholdRule,
    openForMaterial: openThresholdConfig,
  } = thresholdDialog
  const {
    open: reconcileConfirmOpen,
    isSubmitting: isReconciling,
    onOpenChange: handleReconcileConfirmOpenChange,
    onConfirm: onConfirmReconcile,
    requestOpen: handleHardReconcile,
  } = reconcileDialog

  if (readResource.status === 'error' && isForbiddenError(readResource.error)) {
    return <ForbiddenState />
  }

  if (readResource.status === 'error') {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <StockMgmtHeader
          alertCount={0}
          materialAlertCount={0}
          bomAlertCount={0}
          totalAssets={0}
          baseCurrencySymbol={baseCurrency?.symbol}
          baseCurrencyPrecision={baseCurrency?.precision}
        />
        <div className='flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-500/25 bg-rose-500/3 px-6 text-center'>
          <AlertCircle className='size-8 text-rose-500' />
          <p className='mt-4 text-[10px] font-black tracking-widest text-rose-700 uppercase'>
            库存总览加载失败
          </p>
          <p className='mt-3 max-w-2xl text-[11px] leading-5 font-bold text-rose-700/80'>
            {readResource.error.message || '请重试后再查看库存总览。'}
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

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      {/* 1. 工业化页眉与统计徽标 */}
      <StockMgmtHeader
        alertCount={alertCount}
        materialAlertCount={materialAlertCount}
        bomAlertCount={bomAlertCount}
        totalAssets={totalAssetsValue}
        baseCurrencySymbol={baseCurrency?.symbol}
        baseCurrencyPrecision={baseCurrency?.precision}
        onOpenBOMAlertDetails={() => setBomAlertDetailsOpen(true)}
      />

      {/* 2. 搜索与对账工具栏 */}
      <StockMgmtToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onReconcile={handleHardReconcile}
      />

      <div className='space-y-6'>
        {readResource.status === 'loading' ? (
          /* 3. 标准加载占位 */
          <div className='flex flex-col items-center justify-center gap-6 py-32'>
            <div className='relative'>
              <div className='absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl' />
              <RefreshCw className='relative size-16 animate-spin text-primary/30' />
            </div>
            <div className='space-y-2 text-center'>
              <p className='animate-pulse text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                {t('warehouse.stock.loadingTitle')}
              </p>
              <p className='text-sm font-bold text-muted-foreground/40'>
                {t('warehouse.stock.loadingHint')}
              </p>
            </div>
          </div>
        ) : (
          /* 4. 分分类响应式列表集 */
          <Accordion
            type='multiple'
            defaultValue={['FINISHED', 'MATERIAL']}
            className='space-y-6'
          >
            {categories.map((category) => {
              const items = groupedInventory[category.code] || []
              if (searchTerm && items.length === 0) return null

              return (
                <StockMgmtCategorySection
                  key={category.code}
                  category={category}
                  items={items}
                  hideZero={!!hideZeroStockMap[category.code]}
                  onHideZeroChange={(checked) => {
                    setHideZeroStockMap((prev) => ({
                      ...prev,
                      [category.code]: checked,
                    }))
                  }}
                  materialTotalStock={materialTotalStock}
                  materialThresholdMap={materialThresholdMap}
                  canConfigureThreshold={canManageThresholdRule}
                  onConfigureThreshold={openThresholdConfig}
                />
              )
            })}
          </Accordion>
        )}
      </div>

      {/* 5. 业务状态流转弹窗 */}
      <MaterialThresholdDialog
        open={configDialogOpen}
        onOpenChange={handleThresholdDialogOpenChange}
        rule={selectedThresholdRule}
        materialOptions={selectedMaterialOptions}
        bomOptions={[]}
        isSubmitting={isSavingThresholdRule}
        onSubmit={handleSaveThresholdRule}
        lockedTargetType='MATERIAL'
        lockedMaterialId={selectedMaterial?.id}
      />

      <BOMAlertDetailsDialog
        open={bomAlertDetailsOpen}
        onOpenChange={setBomAlertDetailsOpen}
      />

      <ConfirmDialog
        open={reconcileConfirmOpen}
        onOpenChange={handleReconcileConfirmOpenChange}
        title={t('warehouse.stock.reconcileDialog.title')}
        desc={t('warehouse.stock.reconcileDialog.description')}
        confirmText={t('warehouse.stock.reconcileDialog.confirm')}
        cancelBtnText={t('warehouse.stock.reconcileDialog.cancel')}
        handleConfirm={onConfirmReconcile}
        isLoading={isReconciling}
      />
    </div>
  )
}
