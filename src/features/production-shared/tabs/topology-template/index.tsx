import { useState } from 'react'
import { Plus, Search, FileCode } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TopologyTemplate } from '../../topology/types'
import { useTopologyTemplates } from '../../topology/use-topology-templates'
import { useHierarchyLevelLabels } from '../hierarchy-config/hooks/use-hierarchy-level-labels'
import { TemplateCard } from './components/template-card'
import { TemplateDialog } from './components/template-dialog'

export function TopologyTemplateMgmt() {
  const { t } = useLanguage()
  const { level1Name, level2Name } = useHierarchyLevelLabels()
  const { templates, addTemplate, removeTemplate, updateTemplate } =
    useTopologyTemplates()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<
    TopologyTemplate | undefined
  >()

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAdd = () => {
    setEditingTemplate(undefined)
    setIsDialogOpen(true)
  }

  const handleEdit = (template: TopologyTemplate) => {
    setEditingTemplate(template)
    setIsDialogOpen(true)
  }

  const handleSave = (data: Partial<TopologyTemplate>) => {
    if (editingTemplate) {
      updateTemplate({ ...editingTemplate, ...data } as TopologyTemplate)
    } else {
      const newTemplate: TopologyTemplate = {
        id: crypto.randomUUID(),
        name: data.name || '',
        description: data.description,
        segments: data.segments || [],
        createdAt: new Date().toISOString(),
      }
      addTemplate(newTemplate)
    }
  }

  return (
    <div className='flex animate-in flex-col gap-8 pb-10 duration-700 fade-in'>
      {/* 顶部 UDS 风格页眉 - 触发重载 HMR_TRIGGER_v2 */}
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <FileCode className='size-4' />
          <h3 className='text-lg font-black tracking-tighter uppercase italic underline decoration-rose-500'>
            {t('orgPersonnel.topologyTemplateMgmt.header.title')}
          </h3>
        </div>
        <p className='text-[9px] font-black tracking-widest text-muted-foreground opacity-60'>
          {t('orgPersonnel.topologyTemplateMgmt.header.subtitle')}
        </p>
      </div>

      <div className='flex items-center justify-between gap-4 px-1'>
        <div className='relative max-w-sm flex-1'>
          <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            placeholder={t(
              'orgPersonnel.topologyTemplateMgmt.list.searchPlaceholder'
            )}
            className='h-12 rounded-2xl border-none bg-muted/50 pl-10 text-sm font-medium transition-all focus-visible:ring-1 focus-visible:ring-primary/20'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          onClick={handleAdd}
          className='h-11 rounded-full px-6 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95'
        >
          <Plus className='mr-2 size-4' />{' '}
          {t('orgPersonnel.topologyTemplateMgmt.list.addTemplate')}
        </Button>
      </div>

      {filteredTemplates.length > 0 ? (
        <div className='grid h-fit grid-cols-1 content-start items-stretch gap-6 px-1'>
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDelete={removeTemplate}
              onUpdate={updateTemplate}
            />
          ))}
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center space-y-4 rounded-[24px] border-dashed border-muted/50 bg-muted/5 p-12 text-center'>
          <FileCode className='size-12 text-muted-foreground/20' />
          <div className='space-y-1'>
            <p className='text-base font-black tracking-tighter text-muted-foreground/60 uppercase italic'>
              {t('orgPersonnel.topologyTemplateMgmt.list.noTemplates')}
            </p>
            <p className='max-w-[400px] text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
              {t('orgPersonnel.topologyTemplateMgmt.list.emptyDescDynamic', {
                level1Name,
                level2Name,
              })}
            </p>
          </div>
          <Button
            onClick={handleAdd}
            variant='outline'
            className='h-11 rounded-full border-dashed px-6 text-[10px] font-black tracking-widest uppercase hover:bg-muted/5'
          >
            {t('orgPersonnel.topologyTemplateMgmt.list.initButton')}
          </Button>
        </div>
      )}

      <TemplateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        template={editingTemplate}
        onSave={handleSave}
      />
    </div>
  )
}
