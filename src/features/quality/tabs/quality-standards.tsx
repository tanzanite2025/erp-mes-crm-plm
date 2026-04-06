'use client'

import { ForbiddenState } from '@/components/forbidden-state'
import { StandardDetailDialog } from '../components/standard-detail-dialog'
import { StandardActionDialog } from '../components/standard-action-dialog'
import { useQualityStandardsMgmt } from '../hooks/use-quality-standards-mgmt'
import { QualityStandardsHeader } from '../components/quality-standards-header'
import { QualityStandardsMobileView } from '../components/quality-standards-mobile-view'
import { QualityStandardsDesktopView } from '../components/quality-standards-desktop-view'
import { QualityStandardsEmpty } from '../components/quality-standards-empty'
import { useIsMobile } from '@/hooks/use-mobile'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'

export function QualityStandards() {
    const { t } = useLanguage()
    const isMobile = useIsMobile()
    const {
        standards,
        total,
        isLoading,
        error,
        searchQuery,
        setSearchQuery,
        isDetailOpen,
        setIsDetailOpen,
        isActionOpen,
        setIsActionOpen,
        selectedStandard,
        actionStandard,
        handleViewDetail,
        handleAdd,
        handleEdit,
        handleSaveStandard,
        isMutationPending
    } = useQualityStandardsMgmt()

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    if (isLoading && standards.length === 0) {
        return (
            <div className='flex flex-col gap-8'>
                <div className='h-32 rounded-[32px] bg-muted/20 animate-pulse' />
                <div className='h-[400px] rounded-[32px] bg-muted/10 animate-pulse' />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
            {/* 1. 工业化页眉与工具栏 */}
            <QualityStandardsHeader 
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onAdd={handleAdd}
                total={total}
            />

            {/* 2. 响应式数据视图 (物理隔离 Mobile/PC) */}
            {standards.length > 0 ? (
                isMobile ? (
                    <QualityStandardsMobileView 
                        standards={standards}
                        onViewDetail={handleViewDetail}
                        onEdit={handleEdit}
                    />
                ) : (
                    <QualityStandardsDesktopView 
                        standards={standards}
                        onViewDetail={handleViewDetail}
                        onEdit={handleEdit}
                    />
                )
            ) : (
                <QualityStandardsEmpty />
            )}

            {/* 3. 数据统计脚注 */}
            <div className='flex items-center justify-center gap-6 py-6'>
                <div className='flex items-center gap-4 px-6 py-2 bg-muted/20 rounded-full border border-dashed border-muted/50'>
                    <span className='text-[10px] font-black text-muted-foreground/40 tracking-widest'>{t('quality.standards.page.totalRecords')}</span>
                    <span className='text-[10px] font-black tabular-nums'>{total}</span>
                </div>
            </div>

            {/* 4. 业务弹窗集控 */}
            <StandardDetailDialog
                open={isDetailOpen}
                onOpenChange={setIsDetailOpen}
                standard={selectedStandard}
            />

            <StandardActionDialog
                open={isActionOpen}
                onOpenChange={setIsActionOpen}
                standard={actionStandard}
                onSave={handleSaveStandard}
                isLoading={isMutationPending}
            />
        </div>
    )
}
