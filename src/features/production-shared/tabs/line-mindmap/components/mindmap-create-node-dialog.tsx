import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { GitBranchPlus, Route } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { ProductionProcessLibraryConfigurationDialog } from '../../../components/production-process-library-configuration-dialog'
import {
  getProductionBOMBranchIdentityKey,
  type ProductionBOMBranch,
} from '../../../data/production-bom-branch'
import type { ProductionProcessStep } from '../../../data/production-process'
import type { LineMindmapProcessDraft, MindmapParentNodeOption } from '../types'

type DialogSubmitValue<T = void> = T | Promise<T>

interface BaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface MindmapCreateSegmentDialogProps extends BaseDialogProps {
  levelName: string
  branches: ProductionBOMBranch[]
  isLoadingBranches?: boolean
  branchQueryError?: Error | null
  onSubmit: (branch: ProductionBOMBranch) => DialogSubmitValue
}

interface MindmapCreateProcessDialogProps extends BaseDialogProps {
  parentLevelName: string
  levelName: string
  parentNodes: MindmapParentNodeOption[]
  defaultParentId?: string
  standardProcesses: ProductionProcessStep[]
  onSubmit: (
    draft: LineMindmapProcessDraft,
    parentSegmentId: string
  ) => DialogSubmitValue<unknown>
}

function MindmapDialogShell({
  open,
  onOpenChange,
  icon,
  title,
  description,
  children,
}: BaseDialogProps & {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  children: ReactNode
}) {
  const Icon = icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] overflow-hidden rounded-[32px] border-none p-0 shadow-2xl sm:max-w-[460px]'>
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
        <div className='relative space-y-6 p-5 md:p-6'>
          <DialogHeader className='space-y-2 text-left'>
            <div className='flex items-center gap-2'>
              <div className='flex size-10 items-center justify-center rounded-full border border-dashed border-primary/30 bg-primary/10'>
                <Icon className='size-4 text-primary' />
              </div>
              <div className='space-y-1'>
                <DialogTitle className='text-sm font-black tracking-tighter uppercase'>
                  {title}
                </DialogTitle>
                <DialogDescription className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function MindmapCreateSegmentDialog({
  open,
  onOpenChange,
  levelName,
  branches,
  isLoadingBranches = false,
  branchQueryError,
  onSubmit,
}: MindmapCreateSegmentDialogProps) {
  const [selectedBranchKey, setSelectedBranchKey] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedBranchKey('')
      setIsSubmitting(false)
    }
  }, [open])

  const selectedBranch = branches.find(
    (branch) => getProductionBOMBranchIdentityKey(branch) === selectedBranchKey
  )

  const handleSubmit = async () => {
    if (!selectedBranch) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(selectedBranch)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MindmapDialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={GitBranchPlus}
      title={`新建${levelName}`}
      description='选择有效生产 MBOM 分支作为 L2'
    >
      <div className='space-y-2'>
        <Select
          value={selectedBranchKey || undefined}
          onValueChange={setSelectedBranchKey}
          disabled={isLoadingBranches || isSubmitting || branches.length === 0}
        >
          <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 px-4 shadow-none'>
            <SelectValue
              placeholder={
                isLoadingBranches
                  ? '正在读取有效生产 MBOM 分支'
                  : '选择产品型号、性能版本和归属'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => {
              const versionLabel = branch.bomVersionLevel || '未指定性能版本'
              const ownerLabel =
                branch.bomOwnerType === 'CUSTOMER'
                  ? `客户 · ${branch.bomOwnerCustomerName || branch.bomOwnerCustomerId}`
                  : '内部'
              return (
                <SelectItem
                  key={getProductionBOMBranchIdentityKey(branch)}
                  value={getProductionBOMBranchIdentityKey(branch)}
                >
                  {[
                    branch.productSKU,
                    branch.productName,
                    versionLabel,
                    ownerLabel,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
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
      </div>
      <DialogFooter className='gap-3 sm:grid sm:grid-cols-2 sm:justify-stretch'>
        <Button
          type='button'
          variant='outline'
          className='h-11 rounded-full border-dashed px-5'
          onClick={() => onOpenChange(false)}
        >
          取消
        </Button>
        <Button
          type='button'
          className='h-11 rounded-full px-5'
          onClick={() => void handleSubmit()}
          disabled={!selectedBranch || isSubmitting}
        >
          确认新建{levelName}
        </Button>
      </DialogFooter>
    </MindmapDialogShell>
  )
}

export function MindmapCreateProcessDialog({
  open,
  onOpenChange,
  parentLevelName,
  levelName,
  parentNodes,
  defaultParentId,
  standardProcesses,
  onSubmit,
}: MindmapCreateProcessDialogProps) {
  const { t } = useLanguage()
  const { allowsPermission, isChecking } = usePermissionActions()
  const [processLibraryOpen, setProcessLibraryOpen] = useState(false)
  const [selectedParentId, setSelectedParentId] = useState(
    defaultParentId ?? ''
  )
  const [draft, setDraft] = useState<LineMindmapProcessDraft>({
    description: '',
    isActive: true,
    name: '',
    processLibraryId: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sourceProcessId, setSourceProcessId] = useState('')
  const resolvedParentId = useMemo(
    () =>
      parentNodes.some((node) => node.id === selectedParentId)
        ? selectedParentId
        : defaultParentId &&
            parentNodes.some((node) => node.id === defaultParentId)
          ? defaultParentId
          : (parentNodes[0]?.id ?? ''),
    [defaultParentId, parentNodes, selectedParentId]
  )
  const selectedParentNode = useMemo(
    () => parentNodes.find((node) => node.id === resolvedParentId) ?? null,
    [parentNodes, resolvedParentId]
  )

  useEffect(() => {
    if (open) {
      setSelectedParentId(defaultParentId ?? '')
      setSourceProcessId('')
      return
    }

    setDraft({
      description: '',
      isActive: true,
      name: '',
      processLibraryId: '',
    })
    setIsSubmitting(false)
  }, [defaultParentId, open])

  const handleSubmit = async () => {
    if (
      !selectedParentNode?.sourceId ||
      !draft.name.trim() ||
      !draft.processLibraryId
    ) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(
        {
          description: draft.description,
          isActive: draft.isActive,
          name: draft.name,
          processLibraryId: draft.processLibraryId,
        },
        selectedParentNode.sourceId
      )
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MindmapDialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={Route}
      title={`新建${levelName}`}
      description='创建第三级工序本体并挂接到指定二级节点'
    >
      <div className='space-y-4'>
        {!isChecking && allowsPermission('menu_prod_config') && (
          <Button
            type='button'
            variant='outline'
            disabled={isSubmitting}
            onClick={() => setProcessLibraryOpen(true)}
          >
            {t('productionArchitecture.processLibrary.manage')}
          </Button>
        )}
        <Select
          value={sourceProcessId || undefined}
          onValueChange={(value) => {
            setSourceProcessId(value === 'none' ? '' : value)
            const source = standardProcesses.find(
              (process) => process.id === value
            )
            if (source) {
              setDraft((current) => ({
                ...current,
                description: source.description ?? '',
                name: source.name,
                processLibraryId: source.id,
              }))
            } else {
              setDraft((current) => ({ ...current, processLibraryId: '' }))
            }
          }}
        >
          <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 px-4 shadow-none'>
            <SelectValue placeholder='选择工序库工序' />
          </SelectTrigger>
          <SelectContent>
            {standardProcesses
              .filter((process) => process.isActive !== false)
              .map((process) => (
                <SelectItem key={process.id} value={process.id}>
                  {process.name}
                  {process.code ? ` · ${process.code}` : ''}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {parentNodes.length > 0 ? (
          <Select
            value={resolvedParentId || undefined}
            onValueChange={setSelectedParentId}
          >
            <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 px-4 shadow-none'>
              <SelectValue placeholder={`选择${parentLevelName}父节点`} />
            </SelectTrigger>
            <SelectContent>
              {parentNodes.map((node) => (
                <SelectItem key={node.id} value={node.id}>
                  {node.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className='rounded-[24px] border border-dashed border-amber-300/70 bg-amber-500/10 px-4 py-4 text-[10px] font-black tracking-widest text-amber-700 uppercase'>
            当前还没有可用的{parentLevelName}节点，请先创建{parentLevelName}。
          </div>
        )}
        <Input
          value={draft.name}
          onChange={(event) =>
            setDraft((current) => ({ ...current, name: event.target.value }))
          }
          placeholder={`输入${levelName}名称`}
          className='h-12 rounded-2xl border-none bg-muted/50 px-4 shadow-none'
        />
        <Textarea
          value={draft.description}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          placeholder={`补充${levelName}说明`}
          className='min-h-24 rounded-[24px] border-none bg-muted/50 shadow-none'
        />
        <Select
          value={draft.isActive ? 'active' : 'inactive'}
          onValueChange={(value) =>
            setDraft((current) => ({
              ...current,
              isActive: value === 'active',
            }))
          }
        >
          <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 px-4 shadow-none'>
            <SelectValue placeholder='选择启用状态' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='active'>启用</SelectItem>
            <SelectItem value='inactive'>停用</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter className='gap-3 sm:grid sm:grid-cols-2 sm:justify-stretch'>
        <Button
          type='button'
          variant='outline'
          className='h-11 rounded-full border-dashed px-5'
          onClick={() => onOpenChange(false)}
        >
          取消
        </Button>
        <Button
          type='button'
          className='h-11 rounded-full px-5'
          onClick={() => void handleSubmit()}
          disabled={
            !selectedParentNode?.sourceId ||
            !draft.name.trim() ||
            !draft.processLibraryId ||
            isSubmitting
          }
        >
          创建并挂接{levelName}
        </Button>
      </DialogFooter>
      <ProductionProcessLibraryConfigurationDialog
        open={open && processLibraryOpen}
        onOpenChange={setProcessLibraryOpen}
      />
    </MindmapDialogShell>
  )
}
