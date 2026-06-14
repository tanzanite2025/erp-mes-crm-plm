import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { GitBranchPlus, Layers3, Route } from 'lucide-react'
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
import type { HierarchyLevelOptionItem } from '../../hierarchy-config/data/hierarchy-config'
import type { LineMindmapProcessDraft, MindmapParentNodeOption } from '../types'

type DialogSubmitValue<T = void> = T | Promise<T>

interface BaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface MindmapCreateRootDialogProps extends BaseDialogProps {
  levelName: string
  options: HierarchyLevelOptionItem[]
  onSubmit: (option: HierarchyLevelOptionItem) => DialogSubmitValue
  onOpenHierarchyConfig: () => void
}

interface MindmapCreateChildDialogProps extends BaseDialogProps {
  parentLevelName: string
  levelName: string
  parentNodes: MindmapParentNodeOption[]
  options: HierarchyLevelOptionItem[]
  defaultParentId?: string
  onSubmit: (
    parentId: string,
    option: HierarchyLevelOptionItem
  ) => DialogSubmitValue
  onOpenHierarchyConfig: () => void
}

interface MindmapCreateProcessDialogProps extends BaseDialogProps {
  parentLevelName: string
  levelName: string
  parentNodes: MindmapParentNodeOption[]
  defaultParentId?: string
  onSubmit: (
    draft: LineMindmapProcessDraft,
    parentJobCategoryId: string
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
                <DialogTitle className='text-sm font-black tracking-tighter uppercase italic'>
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

export function MindmapCreateRootDialog({
  open,
  onOpenChange,
  levelName,
  options,
  onSubmit,
  onOpenHierarchyConfig,
}: MindmapCreateRootDialogProps) {
  const [selectedOptionId, setSelectedOptionId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const resolvedOptionId = useMemo(
    () =>
      options.some((option) => option.id === selectedOptionId)
        ? selectedOptionId
        : (options[0]?.id ?? ''),
    [options, selectedOptionId]
  )
  const selectedOption = useMemo(
    () => options.find((option) => option.id === resolvedOptionId) ?? null,
    [options, resolvedOptionId]
  )

  useEffect(() => {
    if (!open) {
      setIsSubmitting(false)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!selectedOption) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(selectedOption)
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
      description='快速放置一级节点，不再切换右侧大面板'
    >
      <div className='space-y-4'>
        {options.length > 0 ? (
          <Select
            value={resolvedOptionId || undefined}
            onValueChange={setSelectedOptionId}
          >
            <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 px-4 text-[11px] font-black shadow-none'>
              <SelectValue placeholder={`选择${levelName}候选项`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  className='text-[11px] font-black'
                >
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className='rounded-[24px] border border-dashed border-amber-300/70 bg-amber-500/10 px-4 py-4 text-[10px] font-black tracking-widest text-amber-700 uppercase'>
            当前还没有可用的{levelName}候选项，请先去维护层级配置。
          </div>
        )}
      </div>
      <DialogFooter className='gap-3 sm:grid sm:grid-cols-2 sm:justify-stretch'>
        <Button
          type='button'
          variant='outline'
          className='h-11 rounded-full border-dashed px-5 text-[10px] font-black tracking-widest uppercase'
          onClick={onOpenHierarchyConfig}
        >
          <Layers3 className='size-4' /> 维护层级配置
        </Button>
        <Button
          type='button'
          className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
          onClick={() => void handleSubmit()}
          disabled={!selectedOption || isSubmitting}
        >
          确认新建{levelName}
        </Button>
      </DialogFooter>
    </MindmapDialogShell>
  )
}

export function MindmapCreateChildDialog({
  open,
  onOpenChange,
  parentLevelName,
  levelName,
  parentNodes,
  options,
  defaultParentId,
  onSubmit,
  onOpenHierarchyConfig,
}: MindmapCreateChildDialogProps) {
  const [selectedParentId, setSelectedParentId] = useState(
    defaultParentId ?? ''
  )
  const [selectedOptionId, setSelectedOptionId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
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
  const resolvedOptionId = useMemo(
    () =>
      options.some((option) => option.id === selectedOptionId)
        ? selectedOptionId
        : (options[0]?.id ?? ''),
    [options, selectedOptionId]
  )
  const selectedOption = useMemo(
    () => options.find((option) => option.id === resolvedOptionId) ?? null,
    [options, resolvedOptionId]
  )

  useEffect(() => {
    if (open) {
      setSelectedParentId(defaultParentId ?? '')
      return
    }

    setIsSubmitting(false)
  }, [defaultParentId, open])

  const handleSubmit = async () => {
    if (!resolvedParentId || !selectedOption) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(resolvedParentId, selectedOption)
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
      description='先选一级父节点，再快速放置二级节点'
    >
      <div className='space-y-4'>
        {parentNodes.length > 0 ? (
          <Select
            value={resolvedParentId || undefined}
            onValueChange={setSelectedParentId}
          >
            <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 px-4 text-[11px] font-black shadow-none'>
              <SelectValue placeholder={`选择${parentLevelName}父节点`} />
            </SelectTrigger>
            <SelectContent>
              {parentNodes.map((node) => (
                <SelectItem
                  key={node.id}
                  value={node.id}
                  className='text-[11px] font-black'
                >
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

        {options.length > 0 ? (
          <Select
            value={resolvedOptionId || undefined}
            onValueChange={setSelectedOptionId}
          >
            <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 px-4 text-[11px] font-black shadow-none'>
              <SelectValue placeholder={`选择${levelName}候选项`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  className='text-[11px] font-black'
                >
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className='rounded-[24px] border border-dashed border-amber-300/70 bg-amber-500/10 px-4 py-4 text-[10px] font-black tracking-widest text-amber-700 uppercase'>
            当前还没有可用的{levelName}候选项，请先去维护层级配置。
          </div>
        )}
      </div>
      <DialogFooter className='gap-3 sm:grid sm:grid-cols-2 sm:justify-stretch'>
        <Button
          type='button'
          variant='outline'
          className='h-11 rounded-full border-dashed px-5 text-[10px] font-black tracking-widest uppercase'
          onClick={onOpenHierarchyConfig}
        >
          <Layers3 className='size-4' /> 维护层级配置
        </Button>
        <Button
          type='button'
          className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
          onClick={() => void handleSubmit()}
          disabled={!resolvedParentId || !selectedOption || isSubmitting}
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
  onSubmit,
}: MindmapCreateProcessDialogProps) {
  const [selectedParentId, setSelectedParentId] = useState(
    defaultParentId ?? ''
  )
  const [draft, setDraft] = useState<LineMindmapProcessDraft>({
    description: '',
    isActive: true,
    name: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
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
      return
    }

    setDraft({
      description: '',
      isActive: true,
      name: '',
    })
    setIsSubmitting(false)
  }, [defaultParentId, open])

  const handleSubmit = async () => {
    if (!selectedParentNode?.sourceId || !draft.name.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(
        {
          description: draft.description,
          isActive: draft.isActive,
          name: draft.name,
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
      description='创建第三级本体并挂接到指定二级节点'
    >
      <div className='space-y-4'>
        {parentNodes.length > 0 ? (
          <Select
            value={resolvedParentId || undefined}
            onValueChange={setSelectedParentId}
          >
            <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 px-4 text-[11px] font-black shadow-none'>
              <SelectValue placeholder={`选择${parentLevelName}父节点`} />
            </SelectTrigger>
            <SelectContent>
              {parentNodes.map((node) => (
                <SelectItem
                  key={node.id}
                  value={node.id}
                  className='text-[11px] font-black'
                >
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
          className='h-12 rounded-2xl border-none bg-muted/50 px-4 text-[11px] font-black shadow-none'
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
          className='min-h-24 rounded-[24px] border-none bg-muted/50 text-[11px] shadow-none'
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
          <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 px-4 text-[11px] font-black shadow-none'>
            <SelectValue placeholder='选择启用状态' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='active' className='text-[11px] font-black'>
              启用
            </SelectItem>
            <SelectItem value='inactive' className='text-[11px] font-black'>
              停用
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter className='gap-3 sm:grid sm:grid-cols-2 sm:justify-stretch'>
        <Button
          type='button'
          variant='outline'
          className='h-11 rounded-full border-dashed px-5 text-[10px] font-black tracking-widest uppercase'
          onClick={() => onOpenChange(false)}
        >
          取消
        </Button>
        <Button
          type='button'
          className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
          onClick={() => void handleSubmit()}
          disabled={
            !selectedParentNode?.sourceId || !draft.name.trim() || isSubmitting
          }
        >
          创建并挂接{levelName}
        </Button>
      </DialogFooter>
    </MindmapDialogShell>
  )
}
