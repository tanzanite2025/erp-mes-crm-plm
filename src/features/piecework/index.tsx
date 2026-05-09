import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import type { TranslationKey } from '@/locales'
import { getPieceworkTabs } from './tab-config'

export function Piecework() {
    const { t } = useLanguage()
    const tabs = getPieceworkTabs((key: TranslationKey, params?: Record<string, string | number>) => t(key, params))

    return (
        <ModuleTabbedLayout tabs={tabs}>
            <Outlet />
        </ModuleTabbedLayout>
    )
}
