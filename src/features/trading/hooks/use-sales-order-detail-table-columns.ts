interface SalesOrderDetailColumn {
  key: string
  className: string
  label: string
}

export function useSalesOrderDetailTableColumns(t: (key: string) => string): SalesOrderDetailColumn[] {
  return [
    {
      key: 'no',
      className:
        'w-[40px] px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40',
      label: t('tradingSalesOrder.detail.headers.no'),
    },
    {
      key: 'product',
      className: 'px-3 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40',
      label: t('tradingSalesOrder.detail.headers.product'),
    },
    {
      key: 'snapshot',
      className: 'px-3 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40',
      label: t('tradingSalesOrder.detail.headers.snapshot'),
    },
    {
      key: 'shipment',
      className:
        'px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40',
      label: t('tradingSalesOrder.detail.headers.shipment'),
    },
    {
      key: 'productionRef',
      className: 'px-3 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40',
      label: t('tradingSalesOrder.detail.headers.productionRef'),
    },
    {
      key: 'drawing',
      className:
        'px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40',
      label: t('tradingSalesOrder.detail.headers.drawing'),
    },
    {
      key: 'process',
      className: 'px-3 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40',
      label: t('tradingSalesOrder.detail.headers.process'),
    },
    {
      key: 'state',
      className:
        'px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40',
      label: t('tradingSalesOrder.detail.headers.state'),
    },
  ]
}
