'use client'

import { ForbiddenState } from '@/components/forbidden-state'
import { isForbiddenError } from '@/lib/error-status'
import { useMoldLoanMgmt } from '../hooks/use-mold-loan-mgmt'
import { MoldLoanHeader } from '../components/mold-loan-header'
import { MoldLoanToolbar } from '../components/mold-loan-toolbar'
import { MoldLoanList } from '../components/mold-loan-list'
import { MoldLoanActionDialog } from '../components/mold-loan-action-dialog'

export function MoldLoanMgmt() {
    const {
        loans,
        molds,
        partners,
        searchTerm,
        setSearchTerm,
        isOpen,
        setIsOpen,
        mode,
        currentRow,
        error,
        handleAddClick,
        handleDialogSubmit,
        handleReturn
    } = useMoldLoanMgmt()

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    return (
        <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
            {/* 1. 标题与说明 */}
            <MoldLoanHeader />

            {/* 2. 工具栏 (搜索 + 新增入口) */}
            <MoldLoanToolbar 
                searchTerm={searchTerm} 
                onSearchChange={setSearchTerm} 
                onAddClick={() => {
                    handleAddClick('LEND')
                }}
            />

            {/* 3. 数据列表 */}
            <MoldLoanList 
                loans={loans} 
                onReturn={handleReturn} 
            />

            {/* 4. 流转登记操作弹窗 */}
            <MoldLoanActionDialog
                isOpen={isOpen}
                onOpenChange={setIsOpen}
                initialMode={mode}
                currentRow={currentRow}
                molds={molds}
                partners={partners}
                onSubmit={handleDialogSubmit}
            />
        </div>
    )
}
