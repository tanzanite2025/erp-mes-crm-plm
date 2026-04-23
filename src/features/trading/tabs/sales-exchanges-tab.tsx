import { ArrowLeftRight, PackagePlus, Route } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IndustrialHeader } from '@/components/uds/industrial-header'

export function SalesExchangesTab() {
  const { t } = useLanguage()

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={ArrowLeftRight}
        title={t('trading.salesExchanges.title')}
        description={t('trading.salesExchanges.description')}
      />

      <Card className='rounded-2xl border border-dashed border-primary/20 bg-muted/5 shadow-inner md:rounded-[32px]'>
        <CardHeader className='gap-2 border-b border-dashed border-muted/50 bg-muted/20 px-5 py-4 md:px-8 md:py-5'>
          <CardTitle className='text-lg font-black tracking-tighter uppercase italic'>
            {t('trading.salesExchanges.statusTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 px-5 py-5 md:px-8 md:py-8'>
          <p className='text-sm leading-6 text-muted-foreground'>
            {t('trading.salesExchanges.statusDescription')}
          </p>

          <div className='grid gap-4 md:grid-cols-3'>
            <Card className='rounded-2xl border border-dashed border-border/70 bg-background/60 shadow-none'>
              <CardContent className='flex items-start gap-3 p-5'>
                <ArrowLeftRight className='mt-0.5 size-4 text-primary' />
                <div>
                  <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    Scope
                  </p>
                  <p className='mt-2 text-sm font-bold text-foreground'>
                    {t('trading.salesExchanges.scopes.scope')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-2xl border border-dashed border-border/70 bg-background/60 shadow-none'>
              <CardContent className='flex items-start gap-3 p-5'>
                <PackagePlus className='mt-0.5 size-4 text-primary' />
                <div>
                  <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    Replacement
                  </p>
                  <p className='mt-2 text-sm font-bold text-foreground'>
                    {t('trading.salesExchanges.scopes.replacement')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className='rounded-2xl border border-dashed border-border/70 bg-background/60 shadow-none'>
              <CardContent className='flex items-start gap-3 p-5'>
                <Route className='mt-0.5 size-4 text-primary' />
                <div>
                  <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    Future
                  </p>
                  <p className='mt-2 text-sm font-bold text-foreground'>
                    {t('trading.salesExchanges.scopes.future')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
