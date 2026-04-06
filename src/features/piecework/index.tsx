import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getPieceworkTabs } from './tab-config'
import { useLanguage } from '@/context/language-provider'

export function Piecework() {
    const { t } = useLanguage()
    const tabs = getPieceworkTabs(t as any)

    return (
        <ModuleTabbedLayout title={t('piecework.layout.title')} tabs={tabs}>
            <Outlet />
        </ModuleTabbedLayout>
    )
}
