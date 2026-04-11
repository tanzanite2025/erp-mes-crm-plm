import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { PageHeader } from '@/components/layout/page-header'
import { getFinanceTabs } from './tabs'

export function FinanceLayout() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getFinanceTabs(t)}>
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        <PageHeader
          icon={ShieldCheck}
          title={t('finance.layout.title')}
          description={t('finance.layout.subtitle')}
        />

        <Outlet />
      </div>
    </ModuleTabbedLayout>
  )
}
