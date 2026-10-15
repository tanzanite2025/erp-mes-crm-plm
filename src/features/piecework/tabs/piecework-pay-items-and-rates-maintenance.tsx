import { useState } from 'react'
import { Edit, ListChecks, Plus, Save, Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { TableRow, TableCell } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import {
  buildPieceworkFinanceActionDialogShellClasses,
  pieceworkFinanceConfirmationBodyClassName,
  pieceworkFinanceDialogActionClassName,
  pieceworkFinanceDialogContentClassName,
  pieceworkFinanceFieldControlClassName,
  pieceworkFinanceFieldLabelClassName,
  pieceworkFinanceIconActionClassName,
  pieceworkFinancePrimaryActionClassName,
  pieceworkFinanceViewTabsListClassName,
  pieceworkFinanceViewTabsTriggerClassName,
} from '../components/piecework-finance-page-controls-and-action-dialog.styles'
import {
  PieceworkPayrollQueryTable,
  PieceworkPayrollQueryToolbar,
} from '../components/piecework-payroll-query-table-and-toolbar'
import { RateActionDialog } from '../components/rate-action-dialog'
import type { PieceworkPayItem } from '../contracts/independent-piecework-payroll-api-contract'
import type { PieceworkRate } from '../data/schema'
import {
  useGetPieceworkPayItems,
  useIndependentPieceworkPayrollMutations,
} from '../hooks/use-independent-piecework-payroll'
import {
  useGetPieceworkRates,
  usePieceworkRateMutations,
} from '../hooks/use-piecework'

export function PieceworkRules() {
  const { t } = useLanguage()
  const { allowsPermission } = usePermissionActions()
  const canWrite = allowsPermission('perm_manage')
  const itemsQuery = useGetPieceworkPayItems()
  const ratesQuery = useGetPieceworkRates()
  const { saveRateMutation, patchRateMutation, deleteRateMutation } =
    usePieceworkRateMutations()
  const [search, setSearch] = useState('')
  const [itemEditing, setItemEditing] = useState<
    PieceworkPayItem | null | undefined
  >()
  const [rateEditing, setRateEditing] = useState<
    PieceworkRate | null | undefined
  >()
  const [ratePendingDeletion, setRatePendingDeletion] =
    useState<PieceworkRate | null>(null)
  const filterText = search.toLowerCase()
  const items = (itemsQuery.data || []).filter((item) =>
    (item.name + ' ' + item.unit).toLowerCase().includes(filterText)
  )
  const rates = (ratesQuery.data || []).filter((rate) =>
    (rate.payItemName + ' ' + rate.unit).toLowerCase().includes(filterText)
  )
  return (
    <div className='min-w-0 space-y-5'>
      <Tabs defaultValue='rates' className='min-w-0'>
        <TabsList className={pieceworkFinanceViewTabsListClassName}>
          <TabsTrigger
            value='rates'
            className={pieceworkFinanceViewTabsTriggerClassName}
          >
            {t('piecework.payroll.rates')}
          </TabsTrigger>
          <TabsTrigger
            value='items'
            className={pieceworkFinanceViewTabsTriggerClassName}
          >
            {t('piecework.payroll.items')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value='items' className='space-y-4'>
          <PieceworkPayrollQueryToolbar
            title={t('piecework.payroll.items')}
            icon={ListChecks}
            search={search}
            onSearchChange={setSearch}
            onRefresh={() => void itemsQuery.refetch()}
          >
            {canWrite && (
              <Button
                className={pieceworkFinancePrimaryActionClassName}
                onClick={() => setItemEditing(null)}
              >
                <Plus className='size-4' />
                {t('piecework.payroll.addItem')}
              </Button>
            )}
          </PieceworkPayrollQueryToolbar>
          <PieceworkPayrollQueryTable
            headers={[
              t('piecework.payroll.name'),
              t('piecework.payroll.unit'),
              t('piecework.payroll.status'),
              t('piecework.payroll.edit'),
            ]}
            empty={!items.length}
            loading={itemsQuery.isLoading}
            failed={itemsQuery.isError}
          >
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell>
                  {t(
                    item.status === 'active'
                      ? 'piecework.payroll.active'
                      : 'piecework.payroll.inactive'
                  )}
                </TableCell>
                <TableCell>
                  {canWrite && (
                    <Button
                      className={pieceworkFinanceIconActionClassName}
                      size='icon'
                      variant='ghost'
                      title={t('piecework.payroll.edit')}
                      aria-label={t('piecework.payroll.edit')}
                      onClick={() => setItemEditing(item)}
                    >
                      <Edit className='size-4' />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </PieceworkPayrollQueryTable>
        </TabsContent>
        <TabsContent value='rates' className='space-y-4'>
          <PieceworkPayrollQueryToolbar
            title={t('piecework.payroll.rates')}
            search={search}
            onSearchChange={setSearch}
            onRefresh={() => void ratesQuery.refetch()}
          >
            {canWrite && (
              <Button
                className={pieceworkFinancePrimaryActionClassName}
                onClick={() => setRateEditing(null)}
              >
                <Plus className='size-4' />
                {t('piecework.payroll.addRate')}
              </Button>
            )}
          </PieceworkPayrollQueryToolbar>
          <PieceworkPayrollQueryTable
            headers={[
              t('piecework.payroll.item'),
              t('piecework.payroll.unitPrice'),
              t('piecework.payroll.effectiveFrom'),
              t('piecework.payroll.effectiveTo'),
              t('piecework.payroll.status'),
              t('piecework.payroll.edit'),
            ]}
            empty={!rates.length}
            loading={ratesQuery.isLoading}
            failed={ratesQuery.isError}
          >
            {rates.map((rate) => (
              <TableRow key={rate.id}>
                <TableCell>{rate.payItemName}</TableCell>
                <TableCell className='font-mono whitespace-nowrap'>
                  {rate.unitPrice.toFixed(4)} {rate.currency} / {rate.unit}
                </TableCell>
                <TableCell className='whitespace-nowrap'>
                  {rate.effectiveFrom?.slice(0, 10) || '-'}
                </TableCell>
                <TableCell>{rate.effectiveTo?.slice(0, 10) || '-'}</TableCell>
                <TableCell>
                  {t(
                    rate.status === 'active'
                      ? 'piecework.payroll.active'
                      : 'piecework.payroll.inactive'
                  )}
                </TableCell>
                <TableCell>
                  <div className='flex'>
                    {canWrite && (
                      <>
                        <Button
                          className={pieceworkFinanceIconActionClassName}
                          size='icon'
                          variant='ghost'
                          title={t('piecework.payroll.edit')}
                          aria-label={t('piecework.payroll.edit')}
                          onClick={() => setRateEditing(rate)}
                        >
                          <Edit className='size-4' />
                        </Button>
                        <Button
                          className={`${pieceworkFinanceIconActionClassName} hover:bg-destructive/10 hover:text-destructive`}
                          size='icon'
                          variant='ghost'
                          disabled={deleteRateMutation.isPending}
                          title={t('piecework.payroll.delete')}
                          aria-label={t('piecework.payroll.delete')}
                          onClick={() => setRatePendingDeletion(rate)}
                        >
                          <Trash2 className='size-4' />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </PieceworkPayrollQueryTable>
        </TabsContent>
      </Tabs>
      {itemEditing !== undefined && (
        <PieceworkPayItemMaintenanceDialog
          key={itemEditing?.id || 'new'}
          item={itemEditing}
          onClose={() => setItemEditing(undefined)}
        />
      )}
      <RateActionDialog
        currentRow={rateEditing}
        open={rateEditing !== undefined}
        onOpenChange={(open) => {
          if (!open) setRateEditing(undefined)
        }}
        isLoading={saveRateMutation.isPending || patchRateMutation.isPending}
        onSave={({ data, isPatch, delta, version }) => {
          if (isPatch && delta)
            patchRateMutation.mutate(
              { id: data.id, delta, version: version! },
              { onSuccess: () => setRateEditing(undefined) }
            )
          else
            saveRateMutation.mutate(data, {
              onSuccess: () => setRateEditing(undefined),
            })
        }}
      />
      <ConfirmDialog
        className={pieceworkFinanceDialogContentClassName}
        bodyClassName={pieceworkFinanceConfirmationBodyClassName}
        open={ratePendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open && !deleteRateMutation.isPending)
            setRatePendingDeletion(null)
        }}
        title={t('piecework.payroll.delete')}
        desc={t('piecework.payroll.confirmDelete')}
        cancelBtnText={t('piecework.payroll.cancel')}
        confirmText={t('piecework.payroll.delete')}
        destructive
        isLoading={deleteRateMutation.isPending}
        handleConfirm={() => {
          if (!ratePendingDeletion || deleteRateMutation.isPending) return
          deleteRateMutation.mutate(
            {
              id: ratePendingDeletion.id,
              version: ratePendingDeletion.version,
            },
            { onSuccess: () => setRatePendingDeletion(null) }
          )
        }}
      />
    </div>
  )
}

function PieceworkPayItemMaintenanceDialog({
  item,
  onClose,
}: {
  item: PieceworkPayItem | null
  onClose: () => void
}) {
  const { t } = useLanguage()
  const { savePayItem } = useIndependentPieceworkPayrollMutations()
  const shellClasses = buildPieceworkFinanceActionDialogShellClasses()
  const [data, setData] = useState({
    name: item?.name || '',
    unit: item?.unit || '',
    status: item?.status || 'active',
    remarks: item?.remarks || '',
  })
  return (
    <ActionDialogShell
      open
      onOpenChange={(open) => {
        if (!open && !savePayItem.isPending) onClose()
      }}
      title={
        <>
          <ListChecks className='size-5 shrink-0 text-primary' />
          {t(item ? 'piecework.payroll.editItem' : 'piecework.payroll.addItem')}
        </>
      }
      description={t('piecework.payroll.items')}
      descriptionClassName='sr-only'
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      titleClassName={shellClasses.title}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      footer={
        <>
          <Button
            className={pieceworkFinanceDialogActionClassName}
            variant='ghost'
            disabled={savePayItem.isPending}
            onClick={onClose}
          >
            {t('piecework.payroll.cancel')}
          </Button>
          <Button
            className={`${pieceworkFinanceDialogActionClassName} shadow-lg shadow-primary/20`}
            type='submit'
            form='piecework-item-form'
            disabled={savePayItem.isPending}
          >
            <Save className='size-4' />
            {t('piecework.payroll.save')}
          </Button>
        </>
      }
    >
      <form
        id='piecework-item-form'
        onSubmit={(event) => {
          event.preventDefault()
          savePayItem.mutate(
            {
              ...data,
              status: data.status as 'active' | 'inactive',
              ...(item ? { id: item.id, version: item.version } : {}),
            },
            { onSuccess: onClose }
          )
        }}
      >
        <fieldset disabled={savePayItem.isPending} className='grid gap-4'>
          <div className='grid gap-2'>
            <Label
              className={pieceworkFinanceFieldLabelClassName}
              htmlFor='pay-item-name'
            >
              {t('piecework.payroll.name')}
            </Label>
            <Input
              id='pay-item-name'
              className={pieceworkFinanceFieldControlClassName}
              required
              maxLength={255}
              value={data.name}
              onChange={(event) =>
                setData({ ...data, name: event.target.value })
              }
            />
          </div>
          <div className='grid gap-2'>
            <Label
              className={pieceworkFinanceFieldLabelClassName}
              htmlFor='pay-item-unit'
            >
              {t('piecework.payroll.unit')}
            </Label>
            <Input
              id='pay-item-unit'
              className={pieceworkFinanceFieldControlClassName}
              required
              maxLength={20}
              value={data.unit}
              onChange={(event) =>
                setData({ ...data, unit: event.target.value })
              }
            />
          </div>
          <div className='flex items-center justify-between gap-3 rounded-xl bg-muted/45 px-4 py-3'>
            <Switch
              id='pay-item-active'
              checked={data.status === 'active'}
              onCheckedChange={(checked) =>
                setData({ ...data, status: checked ? 'active' : 'inactive' })
              }
            />
            <Label
              className={pieceworkFinanceFieldLabelClassName}
              htmlFor='pay-item-active'
            >
              {t('piecework.payroll.active')}
            </Label>
          </div>
          <div className='grid gap-2'>
            <Label
              className={pieceworkFinanceFieldLabelClassName}
              htmlFor='pay-item-remarks'
            >
              {t('piecework.payroll.remarks')}
            </Label>
            <Textarea
              id='pay-item-remarks'
              className={`${pieceworkFinanceFieldControlClassName} min-h-24 py-3`}
              value={data.remarks}
              onChange={(event) =>
                setData({ ...data, remarks: event.target.value })
              }
            />
          </div>
        </fieldset>
      </form>
    </ActionDialogShell>
  )
}
