import type { QuoteDetail } from '@/features/quotes/data/quote-detail'

export function QuotePrintDocument({ detail }: { detail: QuoteDetail }) {
  return (
    <div className='quote-print-sheet mx-auto w-full bg-white text-[12px] leading-6 text-black'>
      <style type='text/css'>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .quote-print-page-break {
              break-before: page;
              page-break-before: always;
            }
            .quote-print-avoid-break {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
          .quote-print-sheet {
            width: 100%;
            min-height: calc(297mm - 16mm);
            padding: 6mm;
          }
        `}
      </style>

      <div className='border-b-2 border-black pb-4'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <div className='text-[10px] font-semibold uppercase tracking-[0.35em] text-black/55'>Quote Document / Customer Copy</div>
            <div className='mt-1 text-[15px] font-bold leading-5 tracking-[0.12em]'>报价单</div>
            <div className='mt-1 text-[11px] text-black/65'>适用于对客沟通、打印留档与 PDF 交付。</div>
          </div>
          <div className='flex-1 pt-2 text-center'>
            <h1 className='text-2xl font-bold tracking-[0.22em]'>QUOTATION</h1>
            <p className='mt-1 text-[11px] tracking-[0.18em] text-black/55'>正式报价 / FOR CUSTOMER REVIEW</p>
          </div>
          <div className='min-w-[160px] border border-black px-3 py-2 text-right text-[11px] leading-5'>
            <div className='text-black/65'>报价编号</div>
            <div className='font-bold'>{detail.quoteNo || '--'}</div>
          </div>
        </div>
        <div className='mt-4 flex justify-between border-t border-dashed border-black/30 pt-3 text-[11px]'>
          <span>客户：{detail.customerName || '--'}</span>
          <span>打印时间：{new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date())}</span>
        </div>
      </div>

      <section className='mt-6'>
        <div className='border-b border-black pb-2'>
          <h2 className='text-base font-bold tracking-[0.08em]'>报价基础信息</h2>
        </div>
        <div className='mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm'>
          <div><span className='font-bold'>报价名称：</span>{detail.orderName || '--'}</div>
          <div><span className='font-bold'>客户编号：</span>{detail.customerId || '--'}</div>
          <div><span className='font-bold'>报价类型：</span>{detail.type || '--'}</div>
          <div><span className='font-bold'>报价状态：</span>{detail.status || '--'}</div>
          <div><span className='font-bold'>下单日期：</span>{detail.orderDate || '--'}</div>
          <div><span className='font-bold'>交期：</span>{detail.deliveryDate || '--'}</div>
          <div><span className='font-bold'>付款方式：</span>{detail.paymentMethodName || '--'}</div>
          <div><span className='font-bold'>账期：</span>{detail.paymentTermName || '--'}</div>
        </div>
      </section>

      <section className='mt-8'>
        <div className='border-b border-black pb-2'>
          <h2 className='text-base font-bold tracking-[0.08em]'>金额与报价说明</h2>
        </div>
        <div className='quote-print-avoid-break mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]'>
          <div className='border border-black p-4'>
            <div className='grid grid-cols-3 gap-4 text-sm'>
              <div>
                <div className='text-[11px] uppercase tracking-[0.18em] text-black/55'>报价金额</div>
                <div className='mt-2 text-lg font-bold'>{detail.amountLabel || '--'}</div>
              </div>
              <div>
                <div className='text-[11px] uppercase tracking-[0.18em] text-black/55'>数量汇总</div>
                <div className='mt-2 text-lg font-bold'>{detail.quantityLabel || '--'}</div>
              </div>
              <div>
                <div className='text-[11px] uppercase tracking-[0.18em] text-black/55'>负责人</div>
                <div className='mt-2 text-sm font-bold'>{detail.ownerName || '--'}</div>
              </div>
            </div>
          </div>
          <div className='border border-dashed border-black/40 p-4'>
            <div className='text-[11px] uppercase tracking-[0.18em] text-black/55'>需求说明</div>
            <div className='mt-3 min-h-[88px] text-sm leading-6'>
              {detail.requirements || '--'}
            </div>
          </div>
        </div>
      </section>

      <section className='mt-8'>
        <div className='border-b border-black pb-2'>
          <h2 className='text-base font-bold tracking-[0.08em]'>报价明细</h2>
          <p className='mt-1 text-[10px] leading-5 text-black/70'>以下明细用于客户确认产品型号、规格、数量、价格与备注说明，打印版式适配 A4 纵向输出。</p>
        </div>
        <table className='mt-4 w-full border-collapse border border-black text-xs'>
          <colgroup>
            <col className='w-[7%]' />
            <col className='w-[18%]' />
            <col className='w-[14%]' />
            <col className='w-[17%]' />
            <col className='w-[10%]' />
            <col className='w-[10%]' />
            <col className='w-[12%]' />
            <col className='w-[12%]' />
          </colgroup>
          <thead>
            <tr className='bg-gray-100'>
              <th className='border border-black p-2'>行号</th>
              <th className='border border-black p-2'>产品型号</th>
              <th className='border border-black p-2'>产品编码</th>
              <th className='border border-black p-2'>规格</th>
              <th className='border border-black p-2 text-right'>数量</th>
              <th className='border border-black p-2 text-right'>单价</th>
              <th className='border border-black p-2 text-right'>金额</th>
              <th className='border border-black p-2'>备注</th>
            </tr>
          </thead>
          <tbody>
            {detail.lines.map((line) => (
              <tr key={line.id} className='quote-print-avoid-break'>
                <td className='border border-black p-2 text-center align-top'>{line.lineNo}</td>
                <td className='border border-black p-2 align-top font-semibold'>{line.productModel || '--'}</td>
                <td className='border border-black p-2 align-top font-mono text-[11px]'>{line.productCode || '--'}</td>
                <td className='border border-black p-2 align-top'>{line.specification || '--'}</td>
                <td className='border border-black p-2 text-right align-top'>{line.qty}</td>
                <td className='border border-black p-2 text-right align-top'>{line.price}</td>
                <td className='border border-black p-2 text-right align-top font-semibold'>{line.amount}</td>
                <td className='border border-black p-2 align-top'>{line.note || '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className='mt-6 grid grid-cols-2 gap-6 text-sm'>
          <div className='border border-dashed border-black/30 p-4'>
            <div className='text-[11px] uppercase tracking-[0.18em] text-black/55'>客户沟通信息</div>
            <div className='mt-3 space-y-2'>
              <p><span className='font-bold'>微信：</span>{detail.wechat || '--'}</p>
              <p><span className='font-bold'>WhatsApp：</span>{detail.whatsapp || '--'}</p>
            </div>
          </div>
          <div className='border border-dashed border-black/30 p-4'>
            <div className='text-[11px] uppercase tracking-[0.18em] text-black/55'>打印说明</div>
            <div className='mt-3 space-y-2 text-black/75'>
              <p>1. 本报价单为系统导出的对客沟通版本。</p>
              <p>2. 最终成交条件以双方确认记录为准。</p>
              <p>3. 若明细较多，请使用浏览器打印面板保存为 PDF 归档。</p>
            </div>
          </div>
        </div>

        <div className='mt-10 border-t border-dashed border-black/40 pt-3 text-[10px] leading-5 text-black/65'>
          <div className='flex items-start justify-between gap-4'>
            <span className='flex-1'>本单据为系统生成的报价打印件，金额、明细与客户联系方式以系统当前记录为准。</span>
            <span className='shrink-0'>Quotation Standard Print</span>
          </div>
        </div>
      </section>
    </div>
  )
}
