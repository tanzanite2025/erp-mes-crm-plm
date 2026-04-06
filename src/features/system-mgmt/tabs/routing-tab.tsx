import { LayoutList } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/context/language-provider'
import { CommandMgmt } from '../workflow-core/components/command-mgmt'
import { NotificationRuleList } from './notification-rule-list'

export function RoutingTab() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-1 bg-muted/5 p-6 rounded-[32px] border border-dashed border-muted/50'>
        <div className='flex items-center gap-2 text-primary'>
          <LayoutList className='size-4' />
          <h3 className='text-lg font-black tracking-tighter italic uppercase'>{t('systemManagement.routingTab.title')}</h3>
        </div>
        <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
          {t('systemManagement.routingTab.subtitle')}
        </p>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="mb-4 bg-muted/5 p-1 rounded-full h-10 border border-dashed border-muted/50">
          <TabsTrigger value="rules" className="px-6 font-black uppercase tracking-widest text-[10px] rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm italic">{t('systemManagement.routingTab.tabs.rules')}</TabsTrigger>
          <TabsTrigger value="commands" className="px-6 font-black uppercase tracking-widest text-[10px] rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm italic">{t('systemManagement.routingTab.tabs.templates')}</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className='flex items-center gap-2 mb-2 px-1'>
            <LayoutList className='size-3.5 text-blue-600' />
            <h4 className='text-sm font-black tracking-tighter italic uppercase text-slate-800'>{t('systemManagement.routingTab.rulesSectionTitle')}</h4>
          </div>
          <NotificationRuleList />
        </TabsContent>

        <TabsContent value="commands" className="space-y-6">
          <CommandMgmt />
        </TabsContent>
      </Tabs>
    </div>
  )
}
