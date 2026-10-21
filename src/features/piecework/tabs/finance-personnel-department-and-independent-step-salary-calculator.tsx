import { useState } from 'react'
import { format } from 'date-fns'
import { useMutation } from '@tanstack/react-query'
import { Calculator, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IndustrialActionBar } from '@/components/uds/industrial-action-bar'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import {
  pieceworkFinanceFieldControlClassName,
  pieceworkFinanceFieldLabelClassName,
  pieceworkFinanceIconActionClassName,
  pieceworkFinancePrimaryActionClassName,
  pieceworkFinanceSecondaryActionClassName,
  pieceworkFinanceViewTabsListClassName,
  pieceworkFinanceViewTabsTriggerClassName,
} from '../components/piecework-finance-page-controls-and-action-dialog.styles'
import {
  useFinancePieceworkCalculationOptions,
  useGetPieceworkPayItems,
} from '../hooks/use-independent-piecework-payroll'
import {
  formatFinanceSalaryCurrencyCents,
  summarizeFinanceSalaryByEmployeeDepartmentAndCurrency,
} from '../services/finance-salary-currency-cent-formatting-and-personnel-department-summary'
import { IndependentPieceworkPayrollService } from '../services/independent-piecework-payroll-service'

interface FinanceSalaryEditableRow {
  key: string
  employeeId: string
  departmentId: string
  payItemId: string
  quantity: string
}

function createEmptyFinanceSalaryInputRow(): FinanceSalaryEditableRow {
  return {
    key: crypto.randomUUID(),
    employeeId: '',
    departmentId: '',
    payItemId: '',
    quantity: '',
  }
}

export function PieceworkQuery() {
  return <FinancePersonnelDepartmentSalaryCalculator />
}
export function PieceworkStats() {
  return <FinancePersonnelDepartmentSalaryCalculator />
}

function FinancePersonnelDepartmentSalaryCalculator() {
  const { t } = useLanguage()
  const options = useFinancePieceworkCalculationOptions()
  const items = useGetPieceworkPayItems()
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [rows, setRows] = useState<FinanceSalaryEditableRow[]>(() => [
    createEmptyFinanceSalaryInputRow(),
  ])
  const [groupBy, setGroupBy] = useState('employee')
  const calculation = useMutation({
    mutationFn: IndependentPieceworkPayrollService.calculateSalary,
  })
  const results = calculation.data?.rows ?? []
  const summaries = summarizeFinanceSalaryByEmployeeDepartmentAndCurrency(
    results,
    groupBy === 'department' ? 'department' : 'employee'
  )
  const unavailable =
    options.isPending || items.isPending || options.isError || items.isError
  const selectClass = pieceworkFinanceFieldControlClassName

  function updateFinanceSalaryInputRow(
    key: string,
    update: Partial<FinanceSalaryEditableRow>
  ) {
    calculation.reset()
    setRows((previous) =>
      previous.map((row) => (row.key === key ? { ...row, ...update } : row))
    )
  }

  return (
    <div className='min-w-0 space-y-6 pb-28'>
      <IndustrialHeader
        icon={Calculator}
        title={t('piecework.calculator.title')}
        description={t('piecework.calculator.description')}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (unavailable || calculation.isPending) return
          calculation.mutate({
            calculationDate: date,
            rows: rows.map(
              ({ employeeId, departmentId, payItemId, quantity }) => ({
                employeeId,
                departmentId,
                payItemId,
                quantity: Number(quantity),
              })
            ),
          })
        }}
      >
        <fieldset
          disabled={calculation.isPending}
          className='min-w-0 space-y-4'
        >
          <IndustrialActionBar
            className='min-w-0 gap-3 rounded-[20px] p-3 sm:items-end [&>div]:min-w-0 [&>div:last-child]:flex-wrap'
            leftContent={
              <div className='grid w-full min-w-0 gap-2 sm:w-44'>
                <Label
                  className={pieceworkFinanceFieldLabelClassName}
                  htmlFor='finance-salary-date'
                >
                  {t('piecework.calculator.date')}
                </Label>
                <Input
                  id='finance-salary-date'
                  type='date'
                  required
                  value={date}
                  onChange={(event) => {
                    calculation.reset()
                    setDate(event.target.value)
                  }}
                  className={pieceworkFinanceFieldControlClassName}
                />
              </div>
            }
            rightContent={
              <>
                <Button
                  type='button'
                  variant='outline'
                  className={pieceworkFinanceSecondaryActionClassName}
                  disabled={rows.length >= 500}
                  onClick={() => {
                    calculation.reset()
                    setRows((previous) => [
                      ...previous,
                      createEmptyFinanceSalaryInputRow(),
                    ])
                  }}
                >
                  <Plus className='size-4' />
                  {t('piecework.calculator.addRow')}
                </Button>
                <Button
                  className={pieceworkFinancePrimaryActionClassName}
                  type='submit'
                  disabled={unavailable}
                >
                  <Calculator className='size-4' />
                  {t('piecework.calculator.calculate')}
                </Button>
              </>
            }
          />
          {unavailable && (
            <p className='text-sm text-muted-foreground' role='status'>
              {t(
                options.isError || items.isError
                  ? 'piecework.payroll.loadFailed'
                  : 'piecework.payroll.loading'
              )}
            </p>
          )}
          {(options.isError || items.isError) && (
            <Button
              className={pieceworkFinanceSecondaryActionClassName}
              type='button'
              variant='outline'
              onClick={() => {
                void options.refetch()
                void items.refetch()
              }}
            >
              <RefreshCw className='size-4' />
              {t('piecework.payroll.refresh')}
            </Button>
          )}
          <div className='divide-y divide-dashed border-y border-dashed border-muted/50'>
            {rows.map((row, index) => {
              const item = items.data?.find((item) => item.id === row.payItemId)
              const result = results[index]
              return (
                <div
                  key={row.key}
                  className='grid min-w-0 grid-cols-2 items-start gap-3 py-4 xl:grid-cols-[minmax(150px,1.3fr)_minmax(140px,1fr)_minmax(160px,1.3fr)_minmax(100px,.7fr)_minmax(100px,.7fr)_36px]'
                >
                  <div className='grid min-w-0 gap-1'>
                    <Label
                      className={pieceworkFinanceFieldLabelClassName}
                      htmlFor={'salary-employee-' + row.key}
                    >
                      {t('piecework.calculator.employee')}
                    </Label>
                    <select
                      id={'salary-employee-' + row.key}
                      required
                      value={row.employeeId}
                      className={selectClass}
                      onChange={(event) => {
                        const employee = options.data?.employees.find(
                          (employee) => employee.id === event.target.value
                        )
                        const departmentId = options.data?.departments.some(
                          (department) =>
                            department.id === employee?.departmentId
                        )
                          ? employee!.departmentId
                          : row.departmentId
                        updateFinanceSalaryInputRow(row.key, {
                          employeeId: event.target.value,
                          departmentId,
                        })
                      }}
                    >
                      <option value=''>{t('piecework.payroll.choose')}</option>
                      {options.data?.employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.staffId} / {employee.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className='grid min-w-0 gap-1'>
                    <Label
                      className={pieceworkFinanceFieldLabelClassName}
                      htmlFor={'salary-department-' + row.key}
                    >
                      {t('piecework.calculator.department')}
                    </Label>
                    <select
                      id={'salary-department-' + row.key}
                      required
                      value={row.departmentId}
                      className={selectClass}
                      onChange={(event) =>
                        updateFinanceSalaryInputRow(row.key, {
                          departmentId: event.target.value,
                        })
                      }
                    >
                      <option value=''>{t('piecework.payroll.choose')}</option>
                      {options.data?.departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className='grid min-w-0 gap-1'>
                    <Label
                      className={pieceworkFinanceFieldLabelClassName}
                      htmlFor={'salary-step-' + row.key}
                    >
                      {t('piecework.calculator.step')}
                    </Label>
                    <select
                      id={'salary-step-' + row.key}
                      required
                      value={row.payItemId}
                      className={selectClass}
                      onChange={(event) =>
                        updateFinanceSalaryInputRow(row.key, {
                          payItemId: event.target.value,
                        })
                      }
                    >
                      <option value=''>{t('piecework.payroll.choose')}</option>
                      {items.data
                        ?.filter((item) => item.status === 'active')
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.unit})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className='grid min-w-0 gap-1'>
                    <Label
                      className={pieceworkFinanceFieldLabelClassName}
                      htmlFor={'salary-quantity-' + row.key}
                    >
                      {t('piecework.calculator.quantity')}
                      {item ? ` (${item.unit})` : ''}
                    </Label>
                    <Input
                      id={'salary-quantity-' + row.key}
                      className={pieceworkFinanceFieldControlClassName}
                      type='number'
                      min='0'
                      max='99999999.9999'
                      step='0.0001'
                      required
                      value={row.quantity}
                      onChange={(event) =>
                        updateFinanceSalaryInputRow(row.key, {
                          quantity: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className='min-w-0 space-y-1'>
                    <span className={pieceworkFinanceFieldLabelClassName}>
                      {t('piecework.calculator.amount')}
                    </span>
                    <div
                      className='flex h-11 items-center font-maple-ui text-sm font-semibold'
                      aria-label={t('piecework.calculator.rowAmount')}
                    >
                      {result
                        ? `${formatFinanceSalaryCurrencyCents(result.amountCents)} ${result.currency}`
                        : '-'}
                    </div>
                    <div className='h-4 text-xs text-muted-foreground'>
                      {result && (
                        <>
                          {t('piecework.payroll.unitPrice')}: {result.unitPrice}{' '}
                          / {result.unit}
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    className={`${pieceworkFinanceIconActionClassName} mt-6 justify-self-end hover:bg-destructive/10 hover:text-destructive`}
                    disabled={rows.length === 1}
                    title={t('piecework.calculator.removeRow')}
                    aria-label={t('piecework.calculator.removeRow')}
                    onClick={() => {
                      calculation.reset()
                      setRows((previous) =>
                        previous.filter((entry) => entry.key !== row.key)
                      )
                    }}
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
              )
            })}
          </div>
        </fieldset>
      </form>
      {calculation.isError && (
        <p role='alert' className='text-sm text-destructive'>
          {calculation.error.message}
        </p>
      )}
      {calculation.isPending && (
        <p role='status' className='text-sm text-muted-foreground'>
          {t('piecework.calculator.calculating')}
        </p>
      )}
      {results.length > 0 && (
        <div className='min-w-0 space-y-3'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h3 className='text-base font-semibold'>
              {t('piecework.calculator.summary')}
            </h3>
            <Tabs value={groupBy} onValueChange={setGroupBy}>
              <TabsList className={pieceworkFinanceViewTabsListClassName}>
                <TabsTrigger
                  value='employee'
                  className={pieceworkFinanceViewTabsTriggerClassName}
                >
                  {t('piecework.calculator.byEmployee')}
                </TabsTrigger>
                <TabsTrigger
                  value='department'
                  className={pieceworkFinanceViewTabsTriggerClassName}
                >
                  {t('piecework.calculator.byDepartment')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className='min-w-0 overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t(
                      groupBy === 'department'
                        ? 'piecework.calculator.department'
                        : 'piecework.calculator.employee'
                    )}
                  </TableHead>
                  {groupBy === 'employee' && (
                    <TableHead>
                      {t('piecework.calculator.department')}
                    </TableHead>
                  )}
                  <TableHead>{t('piecework.payroll.currency')}</TableHead>
                  <TableHead className='text-right'>
                    {t('piecework.calculator.amount')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((group) => (
                  <TableRow key={group.key}>
                    <TableCell>{group.name}</TableCell>
                    {groupBy === 'employee' && (
                      <TableCell>{group.departmentName}</TableCell>
                    )}
                    <TableCell>{group.currency}</TableCell>
                    <TableCell className='text-right font-maple-ui'>
                      {formatFinanceSalaryCurrencyCents(group.amountCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
