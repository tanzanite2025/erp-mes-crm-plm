import type { TranslationKey } from '@/locales'

interface SalesOrderDetailColumn {
  key: string
  className: string
  label: string
}

export function useSalesOrderDetailTableColumns(
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): SalesOrderDetailColumn[] {
  return [
    {
      key: 'no',
      className:
        'w-[36px] px-2 py-1 text-center text-[10px] font-black uppercase tracking-wide text-muted-foreground/50',
      label: t('tradingSalesOrder.detail.headers.no'),
    },
    {
      key: 'product',
      className: 'px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground/50',
      label: t('tradingSalesOrder.detail.headers.product'),
    },
    {
      key: 'snapshot',
      className: 'px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground/50',
      label: t('tradingSalesOrder.detail.headers.snapshot'),
    },
    {
      key: 'shipment',
      className:
        'px-2 py-1 text-center text-[10px] font-black uppercase tracking-wide text-muted-foreground/50',
      label: t('tradingSalesOrder.detail.headers.shipment'),
    },
    {
      key: 'drawing',
      className:
        'px-2 py-1 text-center text-[10px] font-black uppercase tracking-wide text-muted-foreground/50',
      label: t('tradingSalesOrder.detail.headers.drawing'),
    },
    {
      key: 'process',
      className: 'px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground/50',
      label: t('tradingSalesOrder.detail.headers.process'),
    },
    {
      key: 'state',
      className:
        'px-2 py-1 text-center text-[10px] font-black uppercase tracking-wide text-muted-foreground/50',
      label: t('tradingSalesOrder.detail.headers.state'),
    },
  ]
}
