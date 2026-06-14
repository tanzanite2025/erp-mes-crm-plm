import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatSettlementMoney } from '../utils/format-settlement-money'

export interface SettlementAllocationHistoryRecord {
  id: string
  recordNo: string
  recordDate: string
  amount: number
}

export interface SettlementAllocationHistoryItem {
  id: string
  ledgerId: string
  sequenceNo: number
  allocatedAmount: number
  remark: string
}

export interface SettlementAllocationHistoryGroup {
  record: SettlementAllocationHistoryRecord
  allocations: SettlementAllocationHistoryItem[]
}

interface SettlementAllocationHistorySectionProps {
  title: string
  searchFieldId: string
  searchLabel: string
  searchPlaceholder: string
  historySearchTerm: string
  onHistorySearchTermChange: (value: string) => void
  groups: SettlementAllocationHistoryGroup[]
  hasHistory: boolean
  ledgerDisplayMap: Map<string, string>
  currencyCode: string
  emptyLabel: string
  emptyGroupLabel: string
}

export function SettlementAllocationHistorySection({
  title,
  searchFieldId,
  searchLabel,
  searchPlaceholder,
  historySearchTerm,
  onHistorySearchTermChange,
  groups,
  hasHistory,
  ledgerDisplayMap,
  currencyCode,
  emptyLabel,
  emptyGroupLabel,
}: SettlementAllocationHistorySectionProps) {
  return (
    <details className='rounded-[22px] border border-dashed border-muted/60 bg-muted/5 p-4 shadow-inner'>
      <summary className='cursor-pointer text-sm leading-tight font-black tracking-tight select-none marker:text-muted-foreground/60'>
        {title}
      </summary>
      <div className='mt-3 grid gap-3'>
        <div className='grid gap-1.5'>
          <Label
            htmlFor={searchFieldId}
            className='text-[9px] font-black tracking-[0.12em] text-muted-foreground/60 uppercase'
          >
            {searchLabel}
          </Label>
          <Input
            id={searchFieldId}
            value={historySearchTerm}
            onChange={(event) => onHistorySearchTermChange(event.target.value)}
            placeholder={searchPlaceholder}
            className='h-9 rounded-xl text-xs'
          />
        </div>
        <div className='grid max-h-[320px] gap-3 overflow-auto pr-1'>
          {groups.length === 0 || !hasHistory ? (
            <div className='flex min-h-20 items-center justify-center rounded-2xl border border-dashed border-muted/60 bg-background/60 p-3 text-center text-[11px] font-bold text-muted-foreground/50'>
              {emptyLabel}
            </div>
          ) : (
            groups.map(({ record, allocations }) => (
              <div
                key={record.id}
                className='overflow-hidden rounded-2xl border border-dashed border-muted/50 bg-background/70'
              >
                <div className='border-b border-dashed border-muted/50 px-4 py-2.5'>
                  <div className='text-xs font-black tracking-tight'>
                    记录号：{record.recordNo}
                  </div>
                  <div className='mt-1 text-[10px] font-bold text-muted-foreground/60'>
                    日期：{record.recordDate || '-'} / 金额：
                    {formatSettlementMoney(record.amount, currencyCode)}
                  </div>
                </div>
                <Table>
                  <TableHeader className='bg-muted/20'>
                    <TableRow className='hover:bg-transparent'>
                      <TableHead className='h-9 px-3 text-[9px] font-black tracking-[0.12em] text-muted-foreground/55 uppercase'>
                        序号
                      </TableHead>
                      <TableHead className='h-9 px-3 text-[9px] font-black tracking-[0.12em] text-muted-foreground/55 uppercase'>
                        目标台账
                      </TableHead>
                      <TableHead className='h-9 px-3 text-right text-[9px] font-black tracking-[0.12em] text-muted-foreground/55 uppercase'>
                        分摊金额
                      </TableHead>
                      <TableHead className='h-9 px-3 text-[9px] font-black tracking-[0.12em] text-muted-foreground/55 uppercase'>
                        备注
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className='h-14 text-center text-[11px] font-bold text-muted-foreground/50'
                        >
                          {emptyGroupLabel}
                        </TableCell>
                      </TableRow>
                    ) : (
                      allocations.map((allocation) => {
                        const targetLedgerDisplay =
                          ledgerDisplayMap.get(allocation.ledgerId) ??
                          allocation.ledgerId

                        return (
                          <TableRow
                            key={allocation.id}
                            className='border-muted/40'
                          >
                            <TableCell className='px-3 py-2 text-xs font-black tabular-nums'>
                              {allocation.sequenceNo}
                            </TableCell>
                            <TableCell className='px-3 py-2 text-xs font-medium text-muted-foreground'>
                              {targetLedgerDisplay}
                            </TableCell>
                            <TableCell className='px-3 py-2 text-right text-xs font-black tabular-nums'>
                              {formatSettlementMoney(
                                allocation.allocatedAmount,
                                currencyCode
                              )}
                            </TableCell>
                            <TableCell className='px-3 py-2 text-xs font-medium text-muted-foreground'>
                              {allocation.remark || '-'}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </div>
      </div>
    </details>
  )
}
