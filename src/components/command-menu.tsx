import { useCommandMenu } from '@/hooks/use-command-menu'
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
    isSearching,
    groupedItems,
    handleNavigate,
    handleThemeChange
  } = useCommandMenu()

  return (
    <CommandMenuView
      open={open}
      onOpenChange={setOpen}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      isSearching={isSearching}
      groupedItems={groupedItems}
      asyncResults={asyncResults}
      onItemSelect={handleNavigate}
      onThemeSelect={handleThemeChange}
    />
  )
}
