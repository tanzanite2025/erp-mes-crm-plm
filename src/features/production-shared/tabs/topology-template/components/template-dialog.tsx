import { useEffect, useState } from 'react'
import { failLoudly } from '@/lib/safe-catch'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  getProductionBOMBranchDisplayName,
  getProductionBOMBranchIdentityKey,
  type ProductionBOMBranch,
} from '../../../data/production-bom-branch'
import type {
  ProductionLine,
  ProductionTopologyTemplate,
  ProductionTopologyTemplateBranchSnapshot,
} from '../../../data/production-line'
import { normalizeProductionLineCode } from '../../../utils/production-code-normalization'

export type ProductionTopologyTemplateDialogSaveRequest =
  | {
      mode: 'capture'
      sourceLineId: string
      sourceLineVersion: number
      name: string
      description: string
    }
  | { mode: 'edit'; template: ProductionTopologyTemplate }
  | { mode: 'apply'; template: ProductionTopologyTemplate; code: string }

export function TemplateDialog({
  open,
  onOpenChange,
  mode,
  template,
  lines,
  branches,
  initialSourceLine,
  isLoadingSources,
  sourceError,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'capture' | 'edit' | 'apply'
  template?: ProductionTopologyTemplate
  lines: ProductionLine[]
  branches: ProductionBOMBranch[]
  initialSourceLine?: ProductionLine
  isLoadingSources?: boolean
  sourceError?: Error | null
  onSave: (
    request: ProductionTopologyTemplateDialogSaveRequest
  ) => Promise<unknown>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState('')
  const [sourceLineId, setSourceLineId] = useState('')
  const [sourceLineVersion, setSourceLineVersion] = useState(0)
  const [draft, setDraft] = useState<ProductionTopologyTemplate | null>(null)
  const [selectedBranchIdentity, setSelectedBranchIdentity] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(
      template?.name ||
        (initialSourceLine ? `${initialSourceLine.name}拓扑模板` : '')
    )
    setDescription(template?.description || '')
    setCode('')
    setSourceLineId(initialSourceLine?.id || '')
    setSourceLineVersion(initialSourceLine?.version || 0)
    setDraft(template ? structuredClone(template) : null)
    setSelectedBranchIdentity('')
    setError('')
  }, [open, template, initialSourceLine])

  const updateBranchDraft = (
    index: number,
    patch: Partial<ProductionTopologyTemplateBranchSnapshot>
  ) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            snapshot: {
              ...current.snapshot,
              branches: current.snapshot.branches.map((branch, branchIndex) =>
                branchIndex === index ? { ...branch, ...patch } : branch
              ),
            },
          }
        : null
    )
  }
  const addSelectedBranchToTemplateDraft = () => {
    const branch = branches.find(
      (item) =>
        getProductionBOMBranchIdentityKey(item) === selectedBranchIdentity
    )
    if (!branch || !draft) return
    if (
      draft.snapshot.branches.some(
        (item) =>
          getProductionBOMBranchIdentityKey(item) === selectedBranchIdentity
      )
    )
      return
    setDraft({
      ...draft,
      snapshot: {
        ...draft.snapshot,
        branches: [
          ...draft.snapshot.branches,
          {
            productId: branch.productId,
            bomOwnerType: branch.bomOwnerType,
            bomOwnerCustomerId: branch.bomOwnerCustomerId,
            bomVersionLevel: branch.bomVersionLevel,
            name: getProductionBOMBranchDisplayName(branch),
            productSKU: branch.productSKU,
            description: '',
            attributes: null,
            operationReferences: [],
          },
        ],
      },
    })
    setSelectedBranchIdentity('')
  }
  const submitTopologyTemplateDialog = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    setError('')
    try {
      if (mode === 'capture') {
        if (!sourceLineId || !sourceLineVersion)
          throw new Error('请选择已保存的来源 L1')
        await onSave({
          mode,
          sourceLineId,
          sourceLineVersion,
          name: name.trim(),
          description,
        })
      } else if (mode === 'edit' && draft) {
        await onSave({
          mode,
          template: { ...draft, name: name.trim(), description },
        })
      } else if (mode === 'apply' && template) {
        const normalizedCode = normalizeProductionLineCode(code)
        if (!normalizedCode) throw new Error('请输入新 L1 编码')
        await onSave({ mode, template, code: normalizedCode })
      }
      onOpenChange(false)
    } catch (saveError) {
      failLoudly(saveError, 'ProductionTopologyTemplateDialog.submit', {
        silentUI: true,
      })
      setError(
        saveError instanceof Error ? saveError.message : '操作失败，请重试'
      )
    } finally {
      setIsSaving(false)
    }
  }
  const title =
    mode === 'capture'
      ? '从实际 L1 生成拓扑模板'
      : mode === 'edit'
        ? '编辑独立拓扑模板'
        : '从模板新建 L1'
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSaving) onOpenChange(nextOpen)
      }}
    >
      <DialogContent className='max-h-[85dvh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === 'apply'
              ? '创建全新的 L1 和分支关联，工序读取分支当前内容。'
              : '保存独立副本，修改或删除模板不会影响实际生产结构。'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submitTopologyTemplateDialog} className='space-y-4'>
          <fieldset disabled={isSaving} className='space-y-4'>
            {mode === 'capture' && (
              <label className='grid gap-2 text-sm'>
                来源 L1
                <select
                  aria-label='来源 L1'
                  className='h-10 rounded-md border bg-background px-3'
                  value={sourceLineId}
                  disabled={Boolean(initialSourceLine) || isLoadingSources}
                  onChange={(event) => {
                    const line = lines.find(
                      (item) => item.id === event.target.value
                    )
                    setSourceLineId(line?.id || '')
                    setSourceLineVersion(line?.version || 0)
                    if (line && !name) setName(`${line.name}拓扑模板`)
                  }}
                  required
                >
                  <option value=''>选择已建立的 L1</option>
                  {lines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.name} · {line.code}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {mode === 'apply' ? (
              <>
                <p className='text-sm'>
                  模板：{template?.name} · {template?.snapshot.branches.length}{' '}
                  个分支
                </p>
                <label className='grid gap-2 text-sm'>
                  新 L1 编码
                  <Input
                    autoFocus
                    required
                    maxLength={50}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </label>
                <p className='text-sm text-muted-foreground'>
                  每次应用都会创建独立结构；不会覆盖已有
                  L1，也不会修改分支工序和路线。
                </p>
              </>
            ) : (
              <>
                <label className='grid gap-2 text-sm'>
                  模板名称
                  <Input
                    required
                    maxLength={255}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label className='grid gap-2 text-sm'>
                  模板说明
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>
              </>
            )}
            {mode === 'edit' && draft && (
              <div className='space-y-3'>
                <p className='text-sm'>
                  L1 产品模板：{draft.snapshot.productTemplateName}
                </p>
                <label className='grid gap-2 text-sm'>
                  新建 L1 时使用的说明
                  <Textarea
                    value={draft.snapshot.lineDescription}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        snapshot: {
                          ...draft.snapshot,
                          lineDescription: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                {draft.snapshot.branches.map((branch, index) => (
                  <div
                    key={`${branch.productId}-${branch.bomVersionLevel}-${index}`}
                    className='space-y-2 rounded-lg border p-3'
                  >
                    <p className='text-sm font-medium'>
                      {index + 1}. {branch.name}
                    </p>
                    <label className='grid gap-2 text-sm'>
                      分支说明
                      <Textarea
                        value={branch.description}
                        onChange={(event) =>
                          updateBranchDraft(index, {
                            description: event.target.value,
                          })
                        }
                      />
                    </label>
                    <p className='text-xs text-muted-foreground'>
                      工序参考：
                      {branch.operationReferences
                        .map((operation) => operation.name)
                        .join('、') || '暂无快照'}
                      。应用时读取分支当前工序。
                    </p>
                    <div className='flex gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        disabled={index === 0}
                        onClick={() => {
                          const nextBranches = [...draft.snapshot.branches]
                          ;[nextBranches[index - 1], nextBranches[index]] = [
                            nextBranches[index],
                            nextBranches[index - 1],
                          ]
                          setDraft({
                            ...draft,
                            snapshot: {
                              ...draft.snapshot,
                              branches: nextBranches,
                            },
                          })
                        }}
                      >
                        上移
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() =>
                          setDraft({
                            ...draft,
                            snapshot: {
                              ...draft.snapshot,
                              branches: draft.snapshot.branches.filter(
                                (_, branchIndex) => branchIndex !== index
                              ),
                            },
                          })
                        }
                      >
                        移除分支
                      </Button>
                    </div>
                  </div>
                ))}
                <label className='grid gap-2 text-sm'>
                  添加有效 MBOM 分支
                  <select
                    aria-label='添加有效 MBOM 分支'
                    className='h-10 rounded-md border bg-background px-3'
                    value={selectedBranchIdentity}
                    onChange={(event) =>
                      setSelectedBranchIdentity(event.target.value)
                    }
                    disabled={isLoadingSources || Boolean(sourceError)}
                  >
                    <option value=''>选择已有分支</option>
                    {branches
                      .filter(
                        (branch) =>
                          !draft.snapshot.branches.some(
                            (item) =>
                              getProductionBOMBranchIdentityKey(item) ===
                              getProductionBOMBranchIdentityKey(branch)
                          )
                      )
                      .map((branch) => (
                        <option
                          key={getProductionBOMBranchIdentityKey(branch)}
                          value={getProductionBOMBranchIdentityKey(branch)}
                        >
                          {getProductionBOMBranchDisplayName(branch)}
                        </option>
                      ))}
                  </select>
                </label>
                <Button
                  type='button'
                  variant='outline'
                  disabled={!selectedBranchIdentity}
                  onClick={addSelectedBranchToTemplateDraft}
                >
                  加入模板
                </Button>
              </div>
            )}
            {sourceError && (
              <p role='alert' className='text-sm text-destructive'>
                {sourceError.message}
              </p>
            )}
            {error && (
              <p role='alert' className='text-sm text-destructive'>
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                disabled={
                  isSaving ||
                  (mode === 'capture' &&
                    (!sourceLineId || isLoadingSources || Boolean(sourceError)))
                }
              >
                {isSaving
                  ? '正在保存…'
                  : mode === 'apply'
                    ? '创建新 L1'
                    : '保存模板'}
              </Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  )
}
