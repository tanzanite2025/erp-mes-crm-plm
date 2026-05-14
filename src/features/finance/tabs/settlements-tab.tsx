import { useState } from 'react'
import { BanknoteArrowDown, BanknoteArrowUp } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { SalesReceivablesView } from '@/features/trading/receivables/components/sales-receivables-view'
import { PurchasePayablesView } from '@/features/trading/payables/components/purchase-payables-view'

/**
 * 财务中心 → 应收应付 TAB 页。
 * 内嵌真实的应收/应付视图组件，隐藏各自的 IndustrialHeader（由本页统一提供）。
 */
export function SettlementsTab() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('receivables')

  return (
    <div className='space-y-6 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={activeTab === 'receivables' ? BanknoteArrowDown : BanknoteArrowUp}
        title={t('finance.settlements.page.title')}
        description={t('finance.settlements.page.description')}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full space-y-6'>
        <TabsList className='bg-muted/50 p-1.5 rounded-2xl h-12 border border-dashed border-primary/20 gap-1'>
          <TabsTrigger
            value='receivables'
            className='h-9 rounded-xl px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg'
          >
            {t('finance.settlements.tabs.receivables')}
          </TabsTrigger>
          <TabsTrigger
            value='payables'
            className='h-9 rounded-xl px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg'
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
