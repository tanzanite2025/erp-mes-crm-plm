import { useState } from 'react'
import { BanknoteArrowDown, BanknoteArrowUp } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { PurchasePayablesView } from '@/features/trading/payables/components/purchase-payables-view'
import { SalesReceivablesView } from '@/features/trading/receivables/components/sales-receivables-view'

/**
 * 财务中心 → 应收应付 TAB 页。
 * 内嵌真实的应收/应付视图组件，隐藏各自的 IndustrialHeader（由本页统一提供）。
 */
export function SettlementsTab() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('receivables')

  return (
    <div className='animate-in space-y-6 duration-700 fade-in'>
      <IndustrialHeader
        icon={activeTab === 'receivables' ? BanknoteArrowDown : BanknoteArrowUp}
        title={t('finance.settlements.page.title')}
        description={t('finance.settlements.page.description')}
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='w-full space-y-6'
      >
        <TabsList className='h-12 gap-1 rounded-2xl border border-dashed border-primary/20 bg-muted/50 p-1.5'>
          <TabsTrigger
            value='receivables'
            className='h-9 rounded-xl px-6 text-[10px] font-black tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg'
          >
            {t('finance.settlements.tabs.receivables')}
          </TabsTrigger>
          <TabsTrigger
            value='payables'
            className='h-9 rounded-xl px-6 text-[10px] font-black tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg'
          >
            {t('finance.settlements.tabs.payables')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='receivables' className='mt-0'>
          <SalesReceivablesView showHeader={false} />
        </TabsContent>

        <TabsContent value='payables' className='mt-0'>
          <PurchasePayablesView showHeader={false} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
