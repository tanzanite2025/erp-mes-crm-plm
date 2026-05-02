import { useCommandMenu } from '@/hooks/use-command-menu'
import { CommandMenuView } from './command-menu-view'
import { QuickActionHost } from './quick-action-host'

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
    activeQuickActionId,
    setActiveQuickActionId,
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
      <QuickActionHost
        actionId={activeQuickActionId}
        onActionChange={setActiveQuickActionId}
        onSearchReset={() => setSearchValue('')}
      />
    </>
  )
}
