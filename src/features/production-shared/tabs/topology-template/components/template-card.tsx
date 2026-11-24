import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ProductionTopologyTemplate } from '../../../data/production-line'

export function TemplateCard({
  template,
  canManage,
  isSaving,
  onEdit,
  onDelete,
  onApply,
}: {
  template: ProductionTopologyTemplate
  canManage: boolean
  isSaving: boolean
  onEdit: (template: ProductionTopologyTemplate) => void
  onDelete: (template: ProductionTopologyTemplate) => void
  onApply: (template: ProductionTopologyTemplate) => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <Card>
      <CardContent className='space-y-3 p-4'>
        <div className='flex flex-wrap items-center gap-3'>
          <Button
            variant='ghost'
            size='icon'
            aria-label={`查看模板 ${template.name}`}
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown /> : <ChevronRight />}
          </Button>
          <div className='min-w-0 flex-1'>
            <p className='font-semibold'>{template.name}</p>
            <p className='text-sm text-muted-foreground'>
              {template.description || '暂无说明'}
            </p>
            <p className='text-xs text-muted-foreground'>
              L1：{template.snapshot.productTemplateName} ·{' '}
              {template.snapshot.branches.length} 个分支 · 版本{' '}
              {template.version}
            </p>
          </div>
          {canManage && (
            <>
              <Button
                variant='outline'
                disabled={isSaving}
                onClick={() => onApply(template)}
              >
                <Copy /> 从模板新建 L1
              </Button>
              <Button
                variant='ghost'
                disabled={isSaving}
                onClick={() => onEdit(template)}
              >
                <Pencil /> 编辑模板
              </Button>
              <Button
                variant='ghost'
                disabled={isSaving}
                onClick={() => onDelete(template)}
              >
                <Trash2 /> 删除模板
              </Button>
            </>
          )}
        </div>
        {expanded && (
          <div className='space-y-3 border-t pt-3'>
            <p className='text-sm text-muted-foreground'>
              来源 L1：{template.snapshot.sourceLineCode}
              。以下为保存时的独立快照。
            </p>
            {template.snapshot.branches.map((branch, index) => (
              <div key={index} className='rounded-lg border p-3'>
                <p className='font-medium'>{branch.name}</p>
                {branch.description && (
                  <p className='text-sm'>{branch.description}</p>
                )}
                <p className='mt-2 text-xs text-muted-foreground'>
                  L3 工序参考快照；新建 L1 时读取分支当前工序
                </p>
                <ol className='mt-1 space-y-1 text-sm'>
                  {branch.operationReferences.map(
                    (operation, operationIndex) => (
                      <li key={operationIndex}>
                        {operation.name}
                        {!operation.isActive && '（停用）'}
                        {operation.description && `：${operation.description}`}
                      </li>
                    )
                  )}
                </ol>
                {branch.operationReferences.length === 0 && (
                  <p className='text-sm text-muted-foreground'>
                    保存时暂无工序
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
