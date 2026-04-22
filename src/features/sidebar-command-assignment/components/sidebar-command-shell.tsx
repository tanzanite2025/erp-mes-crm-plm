import type { PropsWithChildren } from 'react'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getSidebarCommandTabs } from '../tabs'

export function SidebarCommandShell({ children }: PropsWithChildren) {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout
      title={t('sidebarCommandAssignment.moduleTitle')}
      tabs={getSidebarCommandTabs(t)}
    >
      <div className='flex min-h-0 flex-col gap-8 p-1 md:p-2'>
        {children}
      </div>
    </ModuleTabbedLayout>
  )
}
