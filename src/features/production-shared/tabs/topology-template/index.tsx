import { useState } from 'react'
import { Plus, Search, FileCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TopologyTemplate } from '../line-mgmt/types'
import { TemplateCard } from './components/template-card'
import { TemplateDialog } from './components/template-dialog'
import { useTopologyTemplates } from '../line-mgmt/hooks/use-topology-templates'
import { useLanguage } from '@/context/language-provider'

export function TopologyTemplateMgmt() {
  const { t } = useLanguage()
  const { templates, addTemplate, removeTemplate, updateTemplate } = useTopologyTemplates()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TopologyTemplate | undefined>()

  const filteredTemplates = templates.filter(t => 
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
        createdAt: new Date().toISOString()
      }
      addTemplate(newTemplate)
    }
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700 pb-10'>
      {/* 顶部 UDS 风格页眉 - 触发重载 HMR_TRIGGER_v2 */}
      <div className='flex flex-col gap-1 bg-muted/5 p-6 rounded-[32px] border border-dashed border-muted/50'>
          <div className='flex items-center gap-2 text-primary'>
              <FileCode className='size-4' />
              <h3 className='text-lg font-black tracking-tighter italic uppercase underline decoration-rose-500'>{t('orgPersonnel.topologyTemplateMgmt.header.title')}</h3>
          </div>
          <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 uppercase'>
              {t('orgPersonnel.topologyTemplateMgmt.header.subtitle')}
          </p>
      </div>

      <div className='flex items-center justify-between gap-4 px-1'>
        <div className='relative max-w-sm flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
          <Input 
            placeholder={t('orgPersonnel.topologyTemplateMgmt.list.searchPlaceholder')} 
            className='pl-10 h-12 rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 text-sm font-medium transition-all'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button 
            onClick={handleAdd}
            className='rounded-full h-11 px-6 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all'
        >
          <Plus className='size-4 mr-2' /> {t('orgPersonnel.topologyTemplateMgmt.list.addTemplate')}
        </Button>
      </div>

      {filteredTemplates.length > 0 ? (
        <div className='grid grid-cols-1 gap-6 px-1 h-fit items-stretch content-start'>
          {filteredTemplates.map(template => (
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
        <div className='rounded-[24px] border-dashed border-muted/50 bg-muted/5 p-12 text-center flex flex-col items-center justify-center space-y-4'>
            <FileCode className='size-12 text-muted-foreground/20' />
            <div className='space-y-1'>
                <p className='text-base font-black italic uppercase tracking-tighter text-muted-foreground/60'>{t('orgPersonnel.topologyTemplateMgmt.list.noTemplates')}</p>
                <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 max-w-[400px]'>
                    {t('orgPersonnel.topologyTemplateMgmt.list.emptyDesc')}
                </p>
            </div>
            <Button 
                onClick={handleAdd} 
                variant='outline' 
                className='rounded-full h-11 px-6 font-black text-[10px] uppercase tracking-widest border-dashed hover:bg-muted/5'
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
