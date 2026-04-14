import { Globe, Phone, Truck, UserRound } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'

type LogisticsDirectoryEntry = {
  code: string
  name: string
  category: 'domestic' | 'international'
  website: string
  contact: string
  phone: string
  note: string
}

const ENTRIES: LogisticsDirectoryEntry[] = [
  {
    code: 'SF',
    name: '顺丰速运 / SF Express',
    category: 'domestic',
    website: 'https://www.sf-express.com',
    contact: '大客户对接经理',
    phone: '95338',
    note: '适合高时效国内订单与企业月结对接。',
  },
  {
    code: 'JD',
    name: '京东物流 / JD Logistics',
    category: 'domestic',
    website: 'https://www.jdl.com',
    contact: '企业物流客服',
    phone: '950616',
    note: '适合仓配一体与大客户配送场景。',
  },
  {
    code: '17TRACK',
    name: '17TRACK International',
    category: 'international',
    website: 'https://www.17track.net',
    contact: '国际物流平台支持',
    phone: 'N/A',
    note: '适合作为国际物流聚合查询与状态补充入口。',
  },
]

export function LogisticsSupplierDirectoryTab() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-1 bg-muted/5 p-6 rounded-[32px] border border-dashed border-muted/50'>
        <div className='flex items-center gap-2 text-primary'>
          <Truck className='size-5' />
          <h2 className='text-lg font-black tracking-tighter italic uppercase'>
            {t('logisticsConfig.suppliers.title')}
          </h2>
        </div>
        <p className='text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
          {t('logisticsConfig.suppliers.description')}
        </p>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
        {ENTRIES.map((entry) => (
          <Card key={entry.code} className='rounded-[28px] border-dashed shadow-none bg-background/80'>
            <CardHeader className='space-y-3'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <CardTitle className='text-base font-black tracking-tight'>{entry.name}</CardTitle>
                  <CardDescription className='text-[10px] font-black uppercase tracking-widest'>
                    {entry.code}
                  </CardDescription>
                </div>
                <Badge className='border-none bg-primary/10 text-primary'>
                  {entry.category === 'domestic'
                    ? t('logisticsConfig.suppliers.categoryDomestic')
                    : t('logisticsConfig.suppliers.categoryInternational')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className='space-y-4 text-sm'>
              <div className='flex items-start gap-3'>
                <Globe className='size-4 mt-0.5 text-primary' />
                <div className='space-y-1 min-w-0'>
                  <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                    {t('logisticsConfig.suppliers.website')}
                  </div>
                  <a className='font-mono text-xs break-all text-blue-600 hover:underline' href={entry.website} target='_blank' rel='noreferrer'>
                    {entry.website}
                  </a>
                </div>
              </div>

              <div className='flex items-start gap-3'>
                <UserRound className='size-4 mt-0.5 text-primary' />
                <div className='space-y-1'>
                  <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                    {t('logisticsConfig.suppliers.contact')}
                  </div>
                  <div className='font-bold'>{entry.contact}</div>
                </div>
              </div>

              <div className='flex items-start gap-3'>
                <Phone className='size-4 mt-0.5 text-primary' />
                <div className='space-y-1'>
                  <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                    {t('logisticsConfig.suppliers.phone')}
                  </div>
                  <div className='font-bold'>{entry.phone}</div>
                </div>
              </div>

              <div className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-[11px] leading-relaxed text-primary/80'>
                {entry.note}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
