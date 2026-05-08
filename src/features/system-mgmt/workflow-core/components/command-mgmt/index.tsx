import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isForbiddenError } from '@/lib/error-status'
import { type StandardCommand } from '../../data/schema'
import { RoutingQueryErrorState } from '../routing-query-error-state'
import { useCommands } from '../../hooks/use-commands'
import { CommandForm } from './command-form.tsx'
import { CommandList } from './command-list.tsx'

export function CommandMgmt({
  searchValue,
  onSearchValueChange,
}: {
  searchValue?: string
  onSearchValueChange?: (value: string) => void
} = {}) {
  const { t } = useLanguage()
  const {
    commands,
    loading,
    error,
    addCommand,
    updateCommand,
    deleteCommand,
    reload,
  } = useCommands()
  const [localSearch, setLocalSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCommand, setEditingCommand] = useState<
    StandardCommand | undefined
  >()

  const search = searchValue ?? localSearch

  const setSearch = (value: string) => {
    if (onSearchValueChange) {
      onSearchValueChange(value)
      return
    }
    setLocalSearch(value)
  }

  const templateCount = commands.length

  const filteredCommands = (commands || []).filter((command) => {
    if (!command) return false

    const keyword = (search || '').toLowerCase()
    return (
      (command.title || '').toLowerCase().includes(keyword) ||
      (command.content || '').toLowerCase().includes(keyword) ||
      (command.targetLink || '').toLowerCase().includes(keyword)
    )
  })

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (loading) {
    return (
      <div className='animate-in space-y-6 fade-in duration-500'>
        <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-10 text-center text-muted-foreground'>
          正在同步通知内容模板...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <RoutingQueryErrorState
        error={error}
        resourceLabel='通知内容模板'
        endpoint='/system/routing/commands'
        protocolShape='通知内容模板列表协议'
        onRetry={() => void reload()}
      />
    )
  }

  const handleEdit = (command: StandardCommand) => {
    setEditingCommand(command)
    setIsFormOpen(true)
  }

  const handleAddNew = () => {
    setEditingCommand(undefined)
    setIsFormOpen(true)
  }

  return (
    <div className='animate-in space-y-5 fade-in duration-500'>
      <div className='flex flex-col gap-3 rounded-[24px] border border-dashed border-muted/40 bg-muted/5 px-5 py-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='relative min-w-56 flex-1'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50' />
          <Input
            placeholder={t('workflowCore.commands.page.searchPlaceholder')}
            className='h-10 rounded-2xl pl-9 text-sm font-bold'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className='flex flex-wrap items-center justify-end gap-2'>
          <Badge
            variant='outline'
            className='rounded-xl border-primary/15 bg-background px-3 py-2 text-[10px] font-bold text-muted-foreground'
          >
            共 {templateCount} 个内容模板
          </Badge>
          <Button
            onClick={handleAddNew}
            className='h-10 gap-2 rounded-2xl text-xs font-black'
          >
            <Plus className='size-4' />
            {t('workflowCore.commands.page.add')}
          </Button>
        </div>
      </div>

      <CommandList
        commands={filteredCommands}
        onDelete={deleteCommand}
        onEdit={handleEdit}
      />

      <CommandForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingCommand}
        onSave={(data: Omit<StandardCommand, 'id' | 'createdAt'>) => {
          if (editingCommand) {
            updateCommand(editingCommand.id, data)
          } else {
            addCommand(data)
          }
          setIsFormOpen(false)
        }}
      />
    </div>
  )
}
