'use client'

import { RefreshCw } from 'lucide-react'
import { Accordion } from '@/components/ui/accordion'
import { ForbiddenState } from '@/components/forbidden-state'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'

import { useStockMgmt } from '../hooks/use-stock-mgmt'
import { StockMgmtHeader } from '../components/stock-mgmt-header'
import { StockMgmtToolbar } from '../components/stock-mgmt-toolbar'
import { StockMgmtCategorySection } from '../components/stock-mgmt-category-section'
import { StockThresholdDialog } from '../components/stock-threshold-dialog'

export default function StockMgmt() {
    const { t } = useLanguage()
    const {
        groupedInventory,
        materialTotalStock,
        alertThresholds,
        categories,
        loading,
        error,
        alertCount,
        searchTerm,
        setSearchTerm,
        hideZeroStockMap,
        setHideZeroStockMap,
        configDialogOpen,
        setConfigDialogOpen,
        selectedMaterial,
        setSelectedMaterial,
        tempThreshold,
        setTempThreshold,
        reconcileConfirmOpen,
        setReconcileConfirmOpen,
        isReconciling,
        handleHardReconcile,
        onConfirmReconcile,
        handleSaveThreshold,
        totalAssetsValue
    } = useStockMgmt()

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            {/* 1. 工业化页眉与统计徽标 */}
            <StockMgmtHeader alertCount={alertCount} totalAssets={totalAssetsValue} />

            {/* 2. 搜索与对账工具栏 */}
            <StockMgmtToolbar 
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onReconcile={handleHardReconcile}
            />

            <div className='space-y-6'>
                {loading ? (
                    /* 3. 标准加载占位 */
                    <div className='py-32 flex flex-col items-center justify-center gap-6'>
                        <div className='relative'>
                            <div className='absolute inset-0 bg-primary/20 blur-xl animate-pulse rounded-full' />
                            <RefreshCw className='size-16 animate-spin text-primary/30 relative' />
                        </div>
                        <div className='text-center space-y-2'>
                            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse'>{t('warehouse.stock.loadingTitle')}</p>
                            <p className='text-sm text-muted-foreground/40 font-bold'>{t('warehouse.stock.loadingHint')}</p>
                        </div>
                    </div>
                ) : (
                    /* 4. 分分类响应式列表集 */
                    <Accordion type='multiple' defaultValue={['FINISHED', 'MATERIAL']} className='space-y-6'>
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
                                            [category.code]: checked
                                        }))
                                    }}
                                    materialTotalStock={materialTotalStock}
                                    alertThresholds={alertThresholds}
                                    onConfigureThreshold={(id, name, current) => {
                                        setSelectedMaterial({ id, name, current })
                                        setTempThreshold(current.toString())
                                        setConfigDialogOpen(true)
                                    }}
                                />
                            )
                        })}
                    </Accordion>
                )}
            </div>

            {/* 5. 业务状态流转弹窗 */}
            <StockThresholdDialog 
                open={configDialogOpen}
                onOpenChange={setConfigDialogOpen}
                material={selectedMaterial}
                tempValue={tempThreshold}
                onValueChange={setTempThreshold}
                onSave={handleSaveThreshold}
            />

            <ConfirmDialog
                open={reconcileConfirmOpen}
                onOpenChange={setReconcileConfirmOpen}
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
