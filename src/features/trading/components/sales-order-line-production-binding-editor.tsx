import { useQuery } from '@tanstack/react-query'
import type { TranslationKey } from '@/locales'
import { Route } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getProductionRouteBOMBranchIdentityKey,
  type ProductionRouteBOMBranch,
} from '@/features/production-shared/data/production-route'
import { productionRoutesService } from '@/features/production-shared/services/production-routes-service'
import type { SalesOrderLine } from '../data/schema'

interface SalesOrderLineProductionBindingEditorProps {
  lines: SalesOrderLine[]
  onLineChange: (
    index: number,
    field: keyof SalesOrderLine,
    value: SalesOrderLine[keyof SalesOrderLine],
    extraData?: Partial<SalesOrderLine>
  ) => void
}

function getBranchDisplayName(
  branch: ProductionRouteBOMBranch,
  t: (key: TranslationKey) => string
) {
  const productType = branch.productTypeName?.trim()
    ? `${t('tradingSalesOrder.linesEditor.productionBinding.productCategory')} ${branch.productTypeName.trim()} · `
    : ''
  const owner =
    branch.bomOwnerType === 'CUSTOMER'
      ? `${t('tradingSalesOrder.linesEditor.productionBinding.customer')} ${branch.bomOwnerCustomerName || branch.bomOwnerCustomerId}`
      : t('tradingSalesOrder.linesEditor.productionBinding.internal')
  return `${productType}${branch.productSKU} · ${branch.productName} · ${branch.bomVersionLevel || t('tradingSalesOrder.linesEditor.productionBinding.noVersion')} · ${owner}`
}

export function SalesOrderLineProductionBindingEditor({
  lines,
  onLineChange,
}: SalesOrderLineProductionBindingEditorProps) {
  const { t } = useLanguage()
  const branchesQuery = useQuery({
    queryKey: ['sales-order-production-mbom-branches'],
    queryFn: productionRoutesService.getBOMBranches,
  })
  const branches = branchesQuery.data ?? []

  return (
    <section className='space-y-3 rounded-lg border bg-background p-4'>
      <div className='flex items-center gap-2'>
        <Route className='size-4 text-primary' />
        <h3 className='text-sm font-semibold'>
          {t('tradingSalesOrder.linesEditor.productionBinding.title')}
        </h3>
      </div>
      <div className='divide-y'>
        {lines.map((line, index) => {
          const productBranches = branches.filter(
            (branch) => branch.productId === line.productId
          )
          const selectedKey = getProductionRouteBOMBranchIdentityKey({
            productId: line.productId ?? '',
            bomOwnerType: line.bomOwnerType ?? '',
            bomOwnerCustomerId: line.bomOwnerCustomerId ?? '',
            bomVersionLevel: line.bomVersionLevel ?? '',
          })
          const selectedBranchExists = productBranches.some(
            (branch) =>
              getProductionRouteBOMBranchIdentityKey(branch) === selectedKey
          )
          const mode = line.productionRouteMode ?? 'DEFAULT'

          return (
            <div
              key={line.id ?? `new-line-${index}`}
              className='grid min-w-0 gap-3 py-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,1.4fr)_minmax(220px,1fr)] md:items-center'
            >
              <div className='min-w-0'>
                <p className='truncate text-sm font-medium'>
                  {line.productModel ||
                    line.productCode ||
                    t(
                      'tradingSalesOrder.linesEditor.productionBinding.unselectedProduct'
                    )}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {t('tradingSalesOrder.linesEditor.lineItem')} #{line.lineNo}
                </p>
              </div>

              <div className='min-w-0 space-y-1.5'>
                <Label htmlFor={`sales-line-branch-${line.lineNo}`}>
                  {t('tradingSalesOrder.linesEditor.productionBinding.branch')}
                </Label>
                <Select
                  value={selectedKey || undefined}
                  onValueChange={(value) => {
                    const branch = productBranches.find(
                      (item) =>
                        getProductionRouteBOMBranchIdentityKey(item) === value
                    )
                    if (!branch) return
                    onLineChange(index, 'bomOwnerType', branch.bomOwnerType, {
                      bomOwnerCustomerId: branch.bomOwnerCustomerId,
                      bomVersionLevel: branch.bomVersionLevel,
                    })
                  }}
                  disabled={!line.productId || branchesQuery.isLoading}
                >
                  <SelectTrigger
                    id={`sales-line-branch-${line.lineNo}`}
                    className='h-9 w-full'
                  >
                    <SelectValue
                      placeholder={t(
                        branchesQuery.isLoading
                          ? 'tradingSalesOrder.linesEditor.productionBinding.loadingBranches'
                          : 'tradingSalesOrder.linesEditor.productionBinding.selectBranch'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {!selectedBranchExists && selectedKey ? (
                      <SelectItem value={selectedKey} disabled>
                        {t(
                          'tradingSalesOrder.linesEditor.productionBinding.unavailableBranch'
                        )}
                      </SelectItem>
                    ) : null}
                    {productBranches.map((branch) => {
                      const identity =
                        getProductionRouteBOMBranchIdentityKey(branch)
                      return (
                        <SelectItem key={identity} value={identity}>
                          {getBranchDisplayName(branch, t)}
                        </SelectItem>
                      )
                    })}
                    {line.productId && productBranches.length === 0 ? (
                      <SelectItem value='NO_EFFECTIVE_BRANCH' disabled>
                        {t(
                          'tradingSalesOrder.linesEditor.productionBinding.noEffectiveBranch'
                        )}
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>

              <RadioGroup
                value={mode}
                onValueChange={(value) =>
                  onLineChange(
                    index,
                    'productionRouteMode',
                    value as 'DEFAULT' | 'CUSTOM'
                  )
                }
                className='flex min-w-0 gap-4'
              >
                <label className='flex min-w-0 items-center gap-2 text-sm'>
                  <RadioGroupItem value='DEFAULT' />
                  <span className='truncate'>
                    {t(
                      'tradingSalesOrder.linesEditor.productionBinding.branchDefault'
                    )}
                  </span>
                </label>
                <label className='flex min-w-0 items-center gap-2 text-sm'>
                  <RadioGroupItem
                    value='CUSTOM'
                    disabled={!selectedBranchExists}
                  />
                  <span className='truncate'>
                    {t(
                      'tradingSalesOrder.linesEditor.productionBinding.orderCustom'
                    )}
                  </span>
                </label>
              </RadioGroup>
            </div>
          )
        })}
      </div>
    </section>
  )
}
