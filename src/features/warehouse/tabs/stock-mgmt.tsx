'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Accordion } from '@/components/ui/accordion'
import { ForbiddenState } from '@/components/forbidden-state'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
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
        readResource,
        groupedInventory,
        materialTotalStock,
        alertThresholds,
        categories,
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
        totalAssetsValue,
        retryRead,
    } = useStockMgmt()

    if (readResource.status === 'error' && isForbiddenError(readResource.error)) {
        return <ForbiddenState />
    }

    if (readResource.status === 'error') {
        return (
            <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
                <StockMgmtHeader alertCount={0} totalAssets={0} />
                <div className='flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-500/25 bg-rose-500/3 px-6 text-center'>
                    <AlertCircle className='size-8 text-rose-500' />
                    <p className='mt-4 text-[10px] font-black uppercase tracking-widest text-rose-700'>库存总览加载失败</p>
                    <p className='mt-3 max-w-2xl text-[11px] font-bold leading-5 text-rose-700/80'>
                        {readResource.error.message || '请重试后再查看库存总览。'}
                    </p>
                    <Button
                        type='button'
                        variant='outline'
                        className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black uppercase tracking-widest'
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
                {readResource.status === 'loading' ? (
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
