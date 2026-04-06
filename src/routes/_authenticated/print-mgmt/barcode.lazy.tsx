import { createLazyFileRoute } from '@tanstack/react-router'
import { BarcodeTemplateManager } from '@/features/print-mgmt/components/barcode-template-manager'
import { useLanguage } from '@/context/language-provider'
import { FileText } from 'lucide-react'

export const Route = createLazyFileRoute('/_authenticated/print-mgmt/barcode')({
  component: BarcodePage,
})

function BarcodePage() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-1 bg-muted/5 p-6 rounded-[32px] border border-dashed border-muted/50'>
        <div className='flex items-center gap-2 text-primary'>
          <FileText className='size-4' />
          <h3 className='text-lg font-black tracking-tighter italic uppercase'>
            {t('printMgmt.pages.barcode.title')}
          </h3>
        </div>
        <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
          {t('printMgmt.pages.barcode.subtitle')}
        </p>
      </div>

      <BarcodeTemplateManager />
    </div>
  )
}
