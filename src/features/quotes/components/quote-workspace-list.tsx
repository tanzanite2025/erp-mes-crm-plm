import { ArrowRightLeft, Ban, FolderClock, MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { QuoteSummary } from '@/features/quotes/data/quote-summary'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type QuoteWorkspaceListProps = {
  activeCustomerLabel: string
  activeStatusLabel: string
  activeTypeLabel: string
  rows: QuoteSummary[]
  resultsLabel: string
  isLoading: boolean
  isError: boolean
  errorMessage: string | null
  onCreateQuote: () => void
  onSelectQuote: (quoteId: string) => void
}

export function QuoteWorkspaceList({
  activeCustomerLabel,
  activeStatusLabel,
  activeTypeLabel,
  rows,
  resultsLabel,
  isLoading,
  isError,
  errorMessage,
  onCreateQuote,
  onSelectQuote,
}: QuoteWorkspaceListProps) {
  const hasRows = rows.length > 0

  return (
    <Card className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 p-1 shadow-inner overflow-hidden'>
        <div className='rounded-[20px] bg-background/60 overflow-hidden'>
          <div className='flex flex-col gap-3 border-b border-dashed border-border/60 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6'>
            <div className='space-y-2'>
              <div className='text-base font-black italic tracking-tight'>报价单列表</div>
              <div className='flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted-foreground'>
                <span>客户：{activeCustomerLabel}</span>
                <span>状态：{activeStatusLabel}</span>
                <span>类型：{activeTypeLabel}</span>
                <Badge variant='outline' className='rounded-full px-2 py-0 text-[10px] font-black'>
                  {resultsLabel}
                </Badge>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Button className='h-9 rounded-2xl px-3 text-xs font-black' size='sm' variant='outline'>
                <FolderClock className='size-4' />
                历史版本
              </Button>
              <Button className='h-9 rounded-2xl px-3 text-xs font-black' size='sm' variant='outline'>
                <Ban className='size-4' />
                作废记录
              </Button>
              <Button className='h-9 rounded-2xl px-3 text-xs font-black' size='sm' variant='outline'>
                <ArrowRightLeft className='size-4' />
                转正式销售订单
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader className='bg-muted/40'>
              <TableRow className='hover:bg-transparent border-none'>
                <TableHead className='h-10 px-5 py-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>报价编号</TableHead>
                <TableHead className='h-10 py-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>客户</TableHead>
                <TableHead className='h-10 py-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>类型</TableHead>
                <TableHead className='h-10 py-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>状态</TableHead>
                <TableHead className='h-10 py-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>金额摘要</TableHead>
                <TableHead className='h-10 py-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>最近更新时间</TableHead>
                <TableHead className='h-10 pr-5 py-0 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-24 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                    正在加载报价列表
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-24 px-6 text-center'>
                    <div className='flex flex-col items-center gap-2'>
                      <Ban className='size-5 text-destructive' />
                      <div className='text-xs font-black text-foreground'>报价列表加载失败</div>
                      <div className='text-xs text-muted-foreground'>{errorMessage || '真实接口请求失败，请检查后端服务、权限或网络链路。'}</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : hasRows
                ? rows.map((row) => (
                    <TableRow key={row.id} className='border-muted/20 hover:bg-muted/30 transition-colors'>
                      <TableCell className='px-5 py-3 text-xs font-bold'>{row.id}</TableCell>
                      <TableCell className='py-3 text-xs font-medium'>
                        <div className='space-y-1'>
                          <div className='font-bold text-foreground'>{row.customerName}</div>
                          <div className='text-xs text-muted-foreground'>{row.productSummary}</div>
                        </div>
                      </TableCell>
                      <TableCell className='py-3 text-xs font-medium'>{row.quoteType}</TableCell>
                      <TableCell className='py-3 text-xs font-medium'>
                        <Badge variant='secondary' className='rounded-full px-2 py-0 text-[10px] font-black'>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className='py-3 text-xs font-medium'>
                        <div className='space-y-1'>
                          <div className='font-bold text-foreground'>{row.amountLabel}</div>
                          <div className='text-xs text-muted-foreground'>{row.itemCount} 项 / {row.ownerName}</div>
                        </div>
                      </TableCell>
                      <TableCell className='py-3 text-xs font-medium'>{row.updatedAt}</TableCell>
                      <TableCell className='pr-5 py-3 text-right'>
                        <Button size='sm' variant='ghost' className='h-8 rounded-full px-3 text-xs font-bold' onClick={() => onSelectQuote(row.id)}>
                          <MoreHorizontal className='mr-1 size-4' />
                          打开工作台
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                : (
                <TableRow>
                  <TableCell colSpan={7} className='h-28 px-6 text-center'>
                    <div className='flex flex-col items-center gap-3'>
                      <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>暂无匹配报价结果</div>
                      <Button size='sm' className='h-9 rounded-2xl px-4 text-xs font-black' onClick={onCreateQuote}>
                        新建报价
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
    </Card>
  )
}
