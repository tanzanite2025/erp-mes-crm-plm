import { useState } from 'react'
import { MessageSquareCode, Plus, Search } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isForbiddenError } from '@/lib/error-status'
import { type StandardCommand } from '../../data/schema'
import { useCommands } from '../../hooks/use-commands'
import { CommandForm } from './command-form.tsx'
import { CommandList } from './command-list.tsx'

export function CommandMgmt() {
  const { t } = useLanguage()
  const { commands, loading, error, addCommand, updateCommand, deleteCommand } = useCommands()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCommand, setEditingCommand] = useState<StandardCommand | undefined>()

  const stats = {
    ALL: commands.length,
    START: commands.filter((command) => command.nodeType === 'START').length,
    APPROVAL: commands.filter((command) => command.nodeType === 'APPROVAL').length,
    CHECK: commands.filter((command) => command.nodeType === 'CHECK').length,
    PRODUCTION: commands.filter((command) => command.nodeType === 'PRODUCTION').length,
  }

  const filteredCommands = (commands || []).filter((command) => {
    if (!command) return false
    if (activeTab !== 'ALL' && command.nodeType !== activeTab) return false

    const keyword = (search || '').toLowerCase()
    return (
      (command.title || '').toLowerCase().includes(keyword) ||
      (command.content || '').toLowerCase().includes(keyword) ||
      (command.actionType || '').toLowerCase().includes(keyword)
    )
  })

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (loading) {
    return (
      <div className='animate-in space-y-6 p-6 fade-in duration-500'>
        <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-10 text-center text-muted-foreground'>
          {t('workflowCore.commands.page.description')}
        </div>
      </div>
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
    <div className='animate-in space-y-6 p-6 fade-in duration-500'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='rounded-xl bg-primary/10 p-2'>
            <MessageSquareCode className='size-5 text-primary' />
          </div>
          <div>
            <h3 className='text-lg font-black uppercase tracking-tighter'>
              {t('workflowCore.commands.page.title')}
            </h3>
            <p className='text-[10px] font-bold uppercase text-muted-foreground opacity-60'>
              {t('workflowCore.commands.page.description')}
            </p>
          </div>
        </div>
        <Button
          onClick={handleAddNew}
          className='gap-2 rounded-xl font-black text-xs uppercase tracking-widest'
        >
          <Plus className='size-4' />
          {t('workflowCore.commands.page.add')}
        </Button>
      </div>

      <div className='flex items-center gap-4 rounded-2xl border-2 border-dashed bg-muted/20 p-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            placeholder={t('workflowCore.commands.page.searchPlaceholder')}
            className='h-10 border-none bg-transparent pl-10 text-sm font-bold focus-visible:ring-0'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='flex h-auto flex-wrap gap-2 bg-transparent p-0'>
          <TabsTrigger
            value='ALL'
            className='gap-2 rounded-xl border px-4 py-2 font-bold text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
          >
            {t('workflowCore.commands.page.tabs.all')} <span className='opacity-50'>{stats.ALL}</span>
          </TabsTrigger>
          <TabsTrigger
            value='START'
            className='gap-2 rounded-xl border border-purple-200 px-4 py-2 font-bold text-xs data-[state=active]:bg-purple-500 data-[state=active]:text-white'
          >
            {t('workflowCore.commands.nodeTypes.start')} <span className='opacity-50'>{stats.START}</span>
          </TabsTrigger>
          <TabsTrigger
            value='APPROVAL'
            className='gap-2 rounded-xl border border-orange-200 px-4 py-2 font-bold text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white'
          >
            {t('workflowCore.commands.nodeTypes.approval')} <span className='opacity-50'>{stats.APPROVAL}</span>
          </TabsTrigger>
          <TabsTrigger
            value='CHECK'
            className='gap-2 rounded-xl border border-blue-200 px-4 py-2 font-bold text-xs data-[state=active]:bg-blue-500 data-[state=active]:text-white'
          >
            {t('workflowCore.commands.nodeTypes.check')} <span className='opacity-50'>{stats.CHECK}</span>
          </TabsTrigger>
          <TabsTrigger
            value='PRODUCTION'
            className='gap-2 rounded-xl border border-emerald-200 px-4 py-2 font-bold text-xs data-[state=active]:bg-emerald-500 data-[state=active]:text-white'
          >
            {t('workflowCore.commands.nodeTypes.production')} <span className='opacity-50'>{stats.PRODUCTION}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <CommandList commands={filteredCommands} onDelete={deleteCommand} onEdit={handleEdit} />

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
