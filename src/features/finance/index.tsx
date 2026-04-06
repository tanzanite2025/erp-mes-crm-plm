import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { getFinanceTabs } from './tabs'

export function FinanceLayout() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getFinanceTabs(t)}>
      <div className='flex flex-col gap-6 px-4 pb-6 pt-0 md:px-6 animate-in fade-in duration-700'>
        <div className='flex flex-col md:flex-row md:items-center justify-between bg-primary/5 p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-dashed border-primary/20 gap-4'>
          <div className='space-y-1.5'>
            <h1 className='text-xl md:text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3'>
              <ShieldCheck className='size-6 md:size-8 text-primary' />
              {t('finance.layout.title')}
            </h1>
            <p className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 md:pl-11 leading-relaxed'>
              {t('finance.layout.subtitle')}
            </p>
          </div>
        </div>

        <Outlet />
      </div>
    </ModuleTabbedLayout>
  )
}
