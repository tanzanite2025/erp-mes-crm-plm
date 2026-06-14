import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getFinanceSettlementsTabs } from '../settlements-tabs'
import { SettlementsTab } from '../tabs/settlements-tab'

/**
 * 应收应付独立页面。
 * 使用 ModuleTabbedLayout 提供顶部模块级 TAB 导航条（只有"应收应付"一个 tab）。
 */
export function SettlementsPage() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getFinanceSettlementsTabs(t)}>
      <SettlementsTab />
    </ModuleTabbedLayout>
  )
}
