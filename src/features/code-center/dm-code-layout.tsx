import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { DMNumberMgmt } from '@/features/basic-settings/tabs/dm-numbering-mgmt'
import { getDmCodeTabs } from './tabs'

export function DmCodeLayout() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout title={t('codeCenter.title')} tabs={getDmCodeTabs(t)}>
      <DMNumberMgmt />
    </ModuleTabbedLayout>
  )
}
