import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { IndustrialActionBar } from '@/components/uds/industrial-action-bar'
import { pieceworkFinanceSecondaryActionClassName } from './piecework-finance-page-controls-and-action-dialog.styles'

export function PieceworkPayrollQueryTable({
  headers,
  children,
  empty,
  loading,
  failed,
}: {
  headers: string[]
  children: ReactNode
  empty: boolean
  loading?: boolean
  failed?: boolean
}) {
  const { t } = useLanguage()
  return (
    <div className='w-full min-w-0 overflow-hidden rounded-[20px] border border-dashed border-muted/50'>
      <Table>
        <TableHeader className='bg-muted/20'>
          <TableRow>
            {headers.map((header, index) => (
              <TableHead key={index} className='whitespace-nowrap'>
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {failed || loading || empty ? (
            <TableRow>
              <TableCell
                colSpan={headers.length}
                className='h-24 text-center text-muted-foreground'
              >
                {t(
                  failed
                    ? 'piecework.payroll.loadFailed'
                    : loading
                      ? 'piecework.payroll.loading'
                      : 'piecework.payroll.empty'
                )}
              </TableCell>
            </TableRow>
          ) : (
            children
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export function PieceworkPayrollQueryToolbar({
  search,
  onSearchChange,
  onRefresh,
  children,
}: {
  search: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  children?: ReactNode
}) {
  const { t } = useLanguage()
  return (
    <IndustrialActionBar
      searchPlaceholder={t('piecework.payroll.search')}
      searchValue={search}
      onSearchChange={onSearchChange}
      className='min-w-0 gap-3 rounded-[20px] p-3 [&>div]:min-w-0 [&>div:last-child]:flex-wrap'
      rightContent={
        <>
          <Button
            variant='outline'
            title={t('piecework.payroll.refresh')}
            onClick={onRefresh}
            className={pieceworkFinanceSecondaryActionClassName}
          >
            <RefreshCw className='size-4' />
            {t('piecework.payroll.refresh')}
          </Button>
          {children}
        </>
      }
    />
  )
}
