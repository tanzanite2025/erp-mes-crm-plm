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
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <section className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <div className='space-y-2'>
          <h2 className='text-xl font-black tracking-tight text-foreground'>
            {t('systemManagement.routingTab.title')}
          </h2>
          <p className='max-w-3xl text-sm leading-6 text-muted-foreground'>
            在这里统一配置业务状态触发的通知与审批，维护可监听的业务事件源、通知内容模板，并在需要时查看执行日志。
          </p>
        </div>
      </section>

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
