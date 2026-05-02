import { useCommandMenu } from '@/hooks/use-command-menu'
import { MaterialUpsertDialog } from '@/features/material-archive/components/material-upsert-dialog'
import { CustomerActionDialog } from '@/features/trading/components/customer-action-dialog'
import { SalesOrderActionDialog } from '@/features/trading/components/sales-order-action-dialog'
import { CommandMenuView } from './command-menu-view'

/**
 * CommandMenu (Orchestrator)
 * 顶部全局搜索弹窗入口
 * 负责连接搜索逻辑 (useCommandMenu) 与 表现层 (CommandMenuView)
 */
export function CommandMenu() {
  const {
    open,
    setOpen,
    searchValue,
    setSearchValue,
    asyncResults,
    knowledgeEntries,
    selectedKnowledgeEntry,
    setSelectedKnowledgeEntry,
    isSearching,
    groupedItems,
    handleItemSelect,
    isMaterialCreateDialogOpen,
    setIsMaterialCreateDialogOpen,
    handleMaterialCreate,
    isCustomerCreateDialogOpen,
    setIsCustomerCreateDialogOpen,
    handleCustomerCreate,
    handleCustomerCreated,
    isSalesOrderCreateDialogOpen,
    setIsSalesOrderCreateDialogOpen,
    handleSalesOrderCreated,
  } = useCommandMenu()

  return (
    <>
      <CommandMenuView
        open={open}
        onOpenChange={setOpen}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        isSearching={isSearching}
        groupedItems={groupedItems}
        asyncResults={asyncResults}
        knowledgeEntries={knowledgeEntries}
        selectedKnowledgeEntry={selectedKnowledgeEntry}
        onKnowledgeSelect={setSelectedKnowledgeEntry}
        onItemSelect={handleItemSelect}
      />
      <MaterialUpsertDialog
        open={isMaterialCreateDialogOpen}
        onOpenChange={setIsMaterialCreateDialogOpen}
        material={null}
        onSave={handleMaterialCreate}
      />
      <CustomerActionDialog
        open={isCustomerCreateDialogOpen}
        onOpenChange={setIsCustomerCreateDialogOpen}
        customer={null}
        onSave={handleCustomerCreate}
        onSaved={handleCustomerCreated}
      />
      <SalesOrderActionDialog
        open={isSalesOrderCreateDialogOpen}
        onOpenChange={setIsSalesOrderCreateDialogOpen}
        order={null}
        onSaved={handleSalesOrderCreated}
      />
    </>
  )
}
