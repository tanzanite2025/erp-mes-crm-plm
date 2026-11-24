import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getProductionBOMBranchDisplayName,
  getProductionBOMBranchIdentityKey,
  type ProductionBOMBranch,
} from '../../../data/production-bom-branch'
import type { LineMindmapNode } from '../data/line-mindmap-domain'

interface MindmapDetailBOMBranchBindingProps {
  selectedNode: LineMindmapNode
  branches: ProductionBOMBranch[]
  isLoadingBranches: boolean
  branchQueryError?: Error | null
  onBindBranch?: (branch: ProductionBOMBranch) => void | Promise<void>
  onDeleteSelected?: () => void | Promise<void>
}

function getCurrentBranchSnapshot(
  node: LineMindmapNode
): ProductionBOMBranch | null {
  const metadata = node.readonlyMeta
  const productId = metadata?.productId?.trim() ?? ''
  const ownerType = metadata?.bomOwnerType?.trim().toUpperCase() ?? ''
  const ownerCustomerId = metadata?.bomOwnerCustomerId?.trim() ?? ''
  if (
    !productId ||
    (ownerType !== 'INTERNAL' && ownerType !== 'CUSTOMER') ||
    (ownerType === 'INTERNAL' && ownerCustomerId !== '') ||
    (ownerType === 'CUSTOMER' && ownerCustomerId === '')
  ) {
    return null
  }

  return {
    productId,
    productSKU: metadata?.productSKU ?? '',
    productName: metadata?.productName ?? '',
    bomOwnerType: ownerType,
    bomOwnerCustomerId: ownerCustomerId,
    bomOwnerCustomerName: metadata?.bomOwnerCustomerName ?? '',
    bomVersionLevel: metadata?.bomVersionLevel ?? '',
  }
}

export function MindmapDetailBOMBranchBinding({
  selectedNode,
  branches,
  isLoadingBranches,
  branchQueryError,
  onBindBranch,
  onDeleteSelected,
}: MindmapDetailBOMBranchBindingProps) {
  const currentBranch = getCurrentBranchSnapshot(selectedNode)
  const currentBranchKey = currentBranch
    ? getProductionBOMBranchIdentityKey(currentBranch)
    : ''
  const [selectedBranchKey, setSelectedBranchKey] = useState(currentBranchKey)

  const selectedBranch = branches.find(
    (branch) => getProductionBOMBranchIdentityKey(branch) === selectedBranchKey
  )
  const selectedBranchIsCurrent =
    selectedBranchKey === currentBranchKey &&
    branches.some(
      (branch) => getProductionBOMBranchIdentityKey(branch) === currentBranchKey
    )

  return (
    <div className='space-y-2'>
      <p className='text-muted-foreground/55'>L2 分支关联</p>
      <div className='space-y-3 rounded-lg border border-muted/40 bg-muted/5 p-4'>
        {currentBranch ? (
          <p className='text-sm text-muted-foreground'>
            当前分支：{getProductionBOMBranchDisplayName(currentBranch)}
            {!branches.some(
              (branch) =>
                getProductionBOMBranchIdentityKey(branch) === currentBranchKey
            )
              ? '（当前分支无效，请重新选择）'
              : ''}
          </p>
        ) : (
          <p className='text-sm text-amber-700'>
            请为该 L2 选择有效生产 MBOM 分支。
          </p>
        )}
        <Select
          value={selectedBranchKey || undefined}
          onValueChange={setSelectedBranchKey}
          disabled={isLoadingBranches || branches.length === 0}
        >
          <SelectTrigger className='h-11 bg-background'>
            <SelectValue
              placeholder={
                isLoadingBranches
                  ? '正在读取有效生产 MBOM 分支'
                  : '选择有效生产 MBOM 分支'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => {
              const identityKey = getProductionBOMBranchIdentityKey(branch)
              return (
                <SelectItem key={identityKey} value={identityKey}>
                  {getProductionBOMBranchDisplayName(branch)}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {branchQueryError ? (
          <p className='text-xs text-destructive'>
            有效生产 MBOM 分支读取失败。
          </p>
        ) : branches.length === 0 && !isLoadingBranches ? (
          <p className='text-xs text-muted-foreground'>
            当前没有可选的有效生产 MBOM 分支。
          </p>
        ) : null}
        <div className='grid gap-3 sm:grid-cols-2'>
          <Button
            type='button'
            onClick={() => {
              if (selectedBranch) void onBindBranch?.(selectedBranch)
            }}
            disabled={
              !selectedBranch || selectedBranchIsCurrent || !onBindBranch
            }
          >
            保存分支关联
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => void onDeleteSelected?.()}
            disabled={!onDeleteSelected}
          >
            删除当前 L2
          </Button>
        </div>
      </div>
    </div>
  )
}
