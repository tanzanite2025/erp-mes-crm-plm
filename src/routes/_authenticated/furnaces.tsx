import { createFileRoute } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { FurnaceMgmt } from '@/features/equipment-tooling/tabs/furnace-mgmt'

export const Route = createFileRoute('/_authenticated/furnaces')({
    component: function FurnacesRoutePage() {
        const { t } = useLanguage()
        const furnaceTabs = [{ key: 'furnaces', label: t('equipmentTooling.layout.tabs.furnaces'), href: '/furnaces' }]

        return (
            <ModuleTabbedLayout title={t('equipmentTooling.layout.title')} tabs={furnaceTabs}>
                <div className='px-4 pb-6 pt-0 md:px-6'>
                    <FurnaceMgmt />
                </div>
            </ModuleTabbedLayout>
        )
    },
})
