import { Library, Logs, Settings2, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CommandMgmt } from '../workflow-core/components/command-mgmt'
import { BusinessEventSourceList } from './business-event-source-list'
import { NotificationRuleList } from './notification-rule-list'
import { RuleExecutionLogTab } from './rule-execution-log-tab'

export function RoutingTab() {
  const { t } = useLanguage()

  return (
    <div className='animate-in space-y-6 duration-700 fade-in'>
      <div className='flex flex-col justify-between gap-4 md:flex-row md:items-center'>
        <section className='flex-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
          <div className='space-y-2'>
            <h2 className='text-lg font-black tracking-tighter uppercase italic'>
              {t('systemManagement.routingTab.title')}
            </h2>
            <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
              {t('systemManagement.routingTab.subtitle')}
            </p>
          </div>
        </section>
      </div>

      <Tabs defaultValue='rules' className='space-y-5'>
        <TabsList className='flex h-auto flex-wrap gap-2 rounded-[24px] bg-transparent p-0'>
          <TabsTrigger
            value='rules'
            className='gap-2 rounded-2xl border px-4 py-2 font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
          >
            <ShieldCheck className='size-4' />
            {t('systemManagement.routingTab.tabs.rules')}
          </TabsTrigger>
          <TabsTrigger
            value='sources'
            className='gap-2 rounded-2xl border px-4 py-2 font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
          >
            <Settings2 className='size-4' />
            {t('systemManagement.routingTab.tabs.sources')}
          </TabsTrigger>
          <TabsTrigger
            value='templates'
            className='gap-2 rounded-2xl border px-4 py-2 font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
          >
            <Library className='size-4' />
            {t('systemManagement.routingTab.tabs.templates')}
          </TabsTrigger>
          <TabsTrigger
            value='executions'
            className='gap-2 rounded-2xl border px-4 py-2 font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
          >
            <Logs className='size-4' />
            {t('systemManagement.routingTab.tabs.executions')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='rules' className='space-y-4'>
          <NotificationRuleList />
        </TabsContent>

        <TabsContent value='sources' className='space-y-4'>
          <BusinessEventSourceList />
        </TabsContent>

        <TabsContent value='templates' className='space-y-4'>
          <CommandMgmt />
        </TabsContent>

        <TabsContent value='executions' className='space-y-4'>
          <RuleExecutionLogTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
