'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Archive, Ruler } from 'lucide-react'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import {
  type CutSizeUnit,
} from '@/features/raw-materials/cut-size-library/data/cut-size-library-schema'
import { formatCutSizeExpression } from '@/features/raw-materials/cut-size-library/domain/cut-size-geometry'
import { CutSizeLibraryService } from '@/features/raw-materials/cut-size-library/services/cut-size-library-service'
import { getCuttingOperationTabs } from '@/features/cutting-operations/tab-config'

const CUTTING_SIZE_INVENTORY_QUERY_KEY = [
  'cutting-operations',
  'size-inventory',
  'cut-size-library',
] as const

function statusClass(status: CutSizeUnit['status']): string {
  if (status === 'Active') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (status === 'Inactive') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  return 'border-slate-200 bg-slate-100 text-slate-600'
}

const STATUS_LABEL_KEY = {
  Active: 'cuttingOperations.sizeInventory.status.Active',
  Inactive: 'cuttingOperations.sizeInventory.status.Inactive',
  Archived: 'cuttingOperations.sizeInventory.status.Archived',
} as const

export function CuttingSizeInventoryTab() {
  const { t } = useLanguage()
  const { data = [], isLoading, error } = useQuery({
    queryKey: CUTTING_SIZE_INVENTORY_QUERY_KEY,
    queryFn: () => CutSizeLibraryService.list(''),
  })

  const usageTypeCount = useMemo(() => {
    const types = new Set(
      data.map((item) => item.usageType.trim()).filter((item) => item.length > 0)
    )
    return types.size
  }, [data])

  return (
    <ModuleTabbedLayout
      title={t('sidebar.items.cuttingOperations')}
      tabs={getCuttingOperationTabs(t)}
    >
      <div className='flex animate-in flex-col gap-5 fade-in duration-700'>
        <IndustrialHeader
          icon={Archive}
          title={t('cuttingOperations.sizeInventory.header.title')}
          description={t('cuttingOperations.sizeInventory.header.description')}
          gradient
        />

        <div className='grid gap-4 md:grid-cols-3'>
          <Card className='rounded-[24px] border border-slate-200 shadow-none'>
            <CardContent className='p-4'>
              <p className='text-xs font-bold text-muted-foreground'>
                {t('cuttingOperations.sizeInventory.metrics.total')}
              </p>
              <p className='mt-2 text-3xl font-black tabular-nums text-slate-900'>
                {data.length}
              </p>
            </CardContent>
          </Card>
          <Card className='rounded-[24px] border border-slate-200 shadow-none'>
            <CardContent className='p-4'>
              <p className='text-xs font-bold text-muted-foreground'>
                {t('cuttingOperations.sizeInventory.metrics.active')}
              </p>
              <p className='mt-2 text-3xl font-black tabular-nums text-slate-900'>
                {data.filter((item) => item.status === 'Active').length}
              </p>
            </CardContent>
          </Card>
          <Card className='rounded-[24px] border border-slate-200 shadow-none'>
            <CardContent className='p-4'>
              <p className='text-xs font-bold text-muted-foreground'>
                {t('cuttingOperations.sizeInventory.metrics.usageTypes')}
              </p>
              <p className='mt-2 text-3xl font-black tabular-nums text-slate-900'>
                {usageTypeCount}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className='rounded-[24px] border border-slate-200 shadow-none'>
          <CardContent className='p-0'>
            <div className='flex items-center justify-between border-b border-slate-200 px-4 py-3'>
              <div className='flex items-center gap-2'>
                <Ruler className='size-4 text-slate-600' />
                <p className='text-sm font-black text-slate-900'>
                  {t('cuttingOperations.sizeInventory.table.title')}
                </p>
              </div>
              <p className='text-xs text-muted-foreground'>
                {t('cuttingOperations.sizeInventory.table.hint')}
              </p>
            </div>
            {error ? (
              <div className='px-4 py-6 text-sm text-rose-600'>
                {t('cuttingOperations.sizeInventory.table.error', {
                  message: error instanceof Error ? error.message : '--',
                })}
              </div>
            ) : null}
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[900px] text-sm'>
                <thead className='bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600'>
                  <tr>
                    <th className='px-4 py-3 text-left'>{t('cuttingOperations.sizeInventory.table.columns.code')}</th>
                    <th className='px-4 py-3 text-left'>{t('cuttingOperations.sizeInventory.table.columns.name')}</th>
                    <th className='px-4 py-3 text-left'>{t('cuttingOperations.sizeInventory.table.columns.size')}</th>
                    <th className='px-4 py-3 text-left'>{t('cuttingOperations.sizeInventory.table.columns.usage')}</th>
                    <th className='px-4 py-3 text-left'>{t('cuttingOperations.sizeInventory.table.columns.sourceStatus')}</th>
                    <th className='px-4 py-3 text-left'>{t('cuttingOperations.sizeInventory.table.columns.inventoryQty')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className='px-4 py-5 text-muted-foreground' colSpan={6}>
                        {t('cuttingOperations.sizeInventory.table.loading')}
                      </td>
                    </tr>
                  ) : null}
                  {!isLoading && data.length === 0 ? (
                    <tr>
                      <td className='px-4 py-5 text-muted-foreground' colSpan={6}>
                        {t('cuttingOperations.sizeInventory.table.empty')}
                      </td>
                    </tr>
                  ) : null}
                  {!isLoading
                    ? data.map((item) => (
                        <tr
                          key={item.id}
                          className='border-t border-slate-100 align-top'
                        >
                          <td className='px-4 py-3 font-semibold text-slate-900'>
                            {item.code || '--'}
                          </td>
                          <td className='px-4 py-3 text-slate-700'>{item.name || '--'}</td>
                          <td className='px-4 py-3 text-slate-700'>
                            {formatCutSizeExpression(item) || '--'}
                          </td>
                          <td className='px-4 py-3 text-slate-700'>
                            {item.usageType || '--'}
                          </td>
                          <td className='px-4 py-3'>
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${statusClass(item.status)}`}
                            >
                              {t(STATUS_LABEL_KEY[item.status])}
                            </span>
                          </td>
                          <td className='px-4 py-3 text-slate-500'>
                            {t('cuttingOperations.sizeInventory.table.pendingInventory')}
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleTabbedLayout>
  )
}
