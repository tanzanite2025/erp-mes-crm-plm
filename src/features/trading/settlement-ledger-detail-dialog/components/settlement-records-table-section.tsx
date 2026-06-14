import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatSettlementMoney } from '../utils/format-settlement-money'

export interface SettlementRecordTableItem {
  id: string
  recordNo: string
  amount: number
  recordDate: string
  paymentMethod?: string
  receivedAt?: string
  receiptAccount?: string
  status: string
  evidences: Array<unknown>
}

interface SettlementRecordsTableSectionProps {
  title: string
  records: SettlementRecordTableItem[]
  currencyCode: string
  selectedRecordId: string | null
  onSelectRecord: (recordId: string) => void
  showOnlyMissingEvidenceRecords: boolean
  onToggleShowOnlyMissingEvidenceRecords: () => void
  showAllLabel: string
  showMissingOnlyLabel: string
  emptyLabel: string
  emptyMissingOnlyLabel: string
  showDetailedColumns?: boolean
  showRecordStatusColumn?: boolean
}

export function SettlementRecordsTableSection({
  title,
  records,
  currencyCode,
  selectedRecordId,
  onSelectRecord,
  showOnlyMissingEvidenceRecords,
  onToggleShowOnlyMissingEvidenceRecords,
  showAllLabel,
  showMissingOnlyLabel,
  emptyLabel,
  emptyMissingOnlyLabel,
  showDetailedColumns = false,
  showRecordStatusColumn = true,
}: SettlementRecordsTableSectionProps) {
  const columnCount =
    5 + (showDetailedColumns ? 2 : 0) + (showRecordStatusColumn ? 1 : 0)

  return (
    <div className='overflow-hidden rounded-[22px] border border-dashed border-muted/60 bg-muted/5 shadow-inner'>
      <div className='flex flex-col gap-2 border-b border-dashed border-muted/50 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='text-sm leading-tight font-black tracking-tight'>
          {title}
        </div>
        <Button
          type='button'
          variant={showOnlyMissingEvidenceRecords ? 'default' : 'outline'}
          size='sm'
          className='h-8 rounded-full px-3 text-[10px] font-black tracking-[0.12em]'
          onClick={onToggleShowOnlyMissingEvidenceRecords}
        >
          {showOnlyMissingEvidenceRecords ? showAllLabel : showMissingOnlyLabel}
        </Button>
      </div>
      <div className='max-h-[280px] overflow-auto'>
        <Table>
          <TableHeader className='sticky top-0 z-10 bg-background'>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='h-9 px-3 text-[9px] font-black tracking-[0.12em] text-muted-foreground/55 uppercase'>
                记录号
              </TableHead>
              <TableHead className='h-9 px-3 text-right text-[9px] font-black tracking-[0.12em] text-muted-foreground/55 uppercase'>
                金额
              </TableHead>
              <TableHead className='h-9 px-3 text-[9px] font-black tracking-[0.12em] text-muted-foreground/55 uppercase'>
                日期
              </TableHead>
              {showDetailedColumns ? (
                <TableHead className='h-9 px-3 text-[9px] font-black tracking-[0.12em] text-muted-foreground/55 uppercase'>
                  收款方式
                </TableHead>
              ) : null}
              {showDetailedColumns ? (
                <TableHead className='h-9 px-3 text-[9px] font-black tracking-[0.12em] text-muted-foreground/55 uppercase'>
                  收款账号
                </TableHead>
              ) : null}
              <TableHead className='h-9 px-3 text-center text-[9px] font-black tracking-[0.12em] text-muted-foreground/55 uppercase'>
                凭证
              </TableHead>
              <TableHead className='h-9 px-3 text-[9px] font-black tracking-[0.12em] text-muted-foreground/55 uppercase'>
                凭证状态
              </TableHead>
              {showRecordStatusColumn ? (
                <TableHead className='h-9 px-3 text-[9px] font-black tracking-[0.12em] text-muted-foreground/55 uppercase'>
                  状态
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className='h-20 text-center text-[11px] font-bold text-muted-foreground/50'
                >
                  {showOnlyMissingEvidenceRecords
                    ? emptyMissingOnlyLabel
                    : emptyLabel}
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => {
                const hasEvidence = record.evidences.length > 0

                return (
                  <TableRow
                    key={record.id}
                    className={cn(
                      'cursor-pointer border-muted/40 transition-colors hover:bg-muted/25',
                      selectedRecordId === record.id && 'bg-primary/5',
                      !hasEvidence && 'bg-destructive/5 hover:bg-destructive/10'
                    )}
                    data-state={
                      selectedRecordId === record.id ? 'selected' : undefined
                    }
                    onClick={() => onSelectRecord(record.id)}
                  >
                    <TableCell className='px-3 py-2 text-xs font-black tracking-tight'>
                      {record.recordNo}
                    </TableCell>
                    <TableCell className='px-3 py-2 text-right text-xs font-black tabular-nums'>
                      {formatSettlementMoney(record.amount, currencyCode)}
                    </TableCell>
                    <TableCell className='px-3 py-2 text-xs font-medium text-muted-foreground'>
                      {record.recordDate}
                    </TableCell>
                    {showDetailedColumns ? (
                      <TableCell className='px-3 py-2 text-xs font-medium text-muted-foreground'>
                        {record.paymentMethod || '-'}
                      </TableCell>
                    ) : null}
                    {showDetailedColumns ? (
                      <TableCell className='px-3 py-2 text-xs font-medium text-muted-foreground'>
                        {record.receiptAccount || '-'}
                      </TableCell>
                    ) : null}
                    <TableCell className='px-3 py-2 text-center text-xs font-black tabular-nums'>
                      {record.evidences.length}
                    </TableCell>
                    <TableCell className='px-3 py-2 text-xs'>
                      <span
                        className={cn(
                          'inline-flex h-6 items-center rounded-full border px-2 text-[9px] font-black tracking-[0.1em]',
                          hasEvidence
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'border-destructive/20 bg-destructive/10 text-destructive'
                        )}
                      >
                        {hasEvidence ? '已挂凭证' : '缺少凭证'}
                      </span>
                    </TableCell>
                    {showRecordStatusColumn ? (
                      <TableCell className='px-3 py-2 text-xs font-semibold text-muted-foreground'>
                        {record.status}
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
