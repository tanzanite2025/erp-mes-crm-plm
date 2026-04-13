import { FileText, Layers3, Route } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'

export function SalesQuotesTab() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <PageHeader
        icon={FileText}
        title={t('trading.quotes.title')}
        description={t('trading.quotes.description')}
      />

      <Card className='rounded-2xl md:rounded-[32px] border border-dashed border-primary/20 bg-muted/5 shadow-inner'>
        <CardHeader className='gap-2 border-b border-dashed border-muted/50 bg-muted/20 px-5 py-4 md:px-8 md:py-5'>
          <CardTitle className='text-lg font-black italic tracking-tighter uppercase'>
            {t('trading.quotes.statusTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 px-5 py-5 md:px-8 md:py-8'>
          <p className='text-sm leading-6 text-muted-foreground'>
            {t('trading.quotes.statusDescription')}
          </p>

          <div className='grid gap-4 md:grid-cols-3'>
            <Card className='rounded-2xl border border-dashed border-border/70 bg-background/60 shadow-none'>
              <CardContent className='flex items-start gap-3 p-5'>
                <Layers3 className='mt-0.5 size-4 text-primary' />
                <div>
                  <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>Tab</p>
                  <p className='mt-2 text-sm font-bold text-foreground'>{t('trading.quotes.scopes.tab')}</p>
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-2xl border border-dashed border-border/70 bg-background/60 shadow-none'>
              <CardContent className='flex items-start gap-3 p-5'>
                <Route className='mt-0.5 size-4 text-primary' />
                <div>
                  <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>Route</p>
                  <p className='mt-2 text-sm font-bold text-foreground'>{t('trading.quotes.scopes.route')}</p>
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-2xl border border-dashed border-border/70 bg-background/60 shadow-none'>
              <CardContent className='flex items-start gap-3 p-5'>
                <FileText className='mt-0.5 size-4 text-primary' />
                <div>
                  <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>Future</p>
                  <p className='mt-2 text-sm font-bold text-foreground'>{t('trading.quotes.scopes.expansion')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
