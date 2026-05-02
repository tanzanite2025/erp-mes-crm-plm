import { Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import {
  KNOWLEDGE_BASE_CATEGORIES,
  normalizeKnowledgeKeywords,
  serializeKnowledgeKeywords,
} from '../data/knowledge-base'
import type { KnowledgeBaseDraft } from '../types'
import { KnowledgeBaseRichTextField } from './knowledge-base-rich-text-field'

interface KnowledgeBaseEntryEditorProps {
  open: boolean
  draft: KnowledgeBaseDraft
  isEditing: boolean
  isSaving: boolean
  onDraftChange: (draft: KnowledgeBaseDraft) => void
  onSave: () => void
  onClose: () => void
}

export function KnowledgeBaseEntryEditor({
  open,
  draft,
  isEditing,
  isSaving,
  onDraftChange,
  onSave,
  onClose,
}: KnowledgeBaseEntryEditorProps) {
  const { t } = useLanguage()
  if (!open) return null

  const updateDraft = (patch: Partial<KnowledgeBaseDraft>) => {
    onDraftChange({ ...draft, ...patch })
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm'>
      <div className='flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border-none bg-background shadow-2xl'>
        <div className='flex items-center justify-between border-b border-dashed border-muted/50 bg-muted/20 px-6 py-4'>
          <div>
            <div className='text-base font-black tracking-tight'>
              {isEditing
                ? t('basicSettings.knowledgeBase.editor.editTitle')
                : t('basicSettings.knowledgeBase.editor.createTitle')}
            </div>
            <div className='mt-1 text-[12px] font-medium text-muted-foreground'>
              {t('basicSettings.knowledgeBase.editor.description')}
            </div>
          </div>
          <Button variant='ghost' size='icon' className='size-9 rounded-full' onClick={onClose}>
            <X className='size-4' />
          </Button>
        </div>

        <div className='grid gap-4 overflow-y-auto px-6 py-5'>
          <div className='grid gap-2'>
            <label className='text-[11px] font-black uppercase tracking-widest text-muted-foreground'>
              {t('basicSettings.knowledgeBase.editor.fields.title')}
            </label>
            <Input
              value={draft.title}
              onChange={(event) => updateDraft({ title: event.target.value })}
              className='h-11 rounded-2xl border-none bg-muted/50 text-[13px] font-bold shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20'
            />
          </div>

          <div className='grid gap-2 sm:grid-cols-[180px_1fr]'>
            <div className='grid gap-2'>
              <label className='text-[11px] font-black uppercase tracking-widest text-muted-foreground'>
                {t('basicSettings.knowledgeBase.editor.fields.category')}
              </label>
              <select
                value={draft.category}
                onChange={(event) =>
                  updateDraft({ category: event.target.value as KnowledgeBaseDraft['category'] })
                }
                className='h-11 rounded-2xl border-none bg-muted/50 px-3 text-[13px] font-bold shadow-inner outline-none focus:ring-1 focus:ring-primary/20'
              >
                {KNOWLEDGE_BASE_CATEGORIES.filter((item) => item.value !== 'all').map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(item.labelKey as any)}
                  </option>
                ))}
              </select>
            </div>
            <div className='grid gap-2'>
              <label className='text-[11px] font-black uppercase tracking-widest text-muted-foreground'>
                {t('basicSettings.knowledgeBase.editor.fields.routePath')}
              </label>
              <Input
                value={draft.routePath}
                onChange={(event) => updateDraft({ routePath: event.target.value })}
                placeholder='/trading/sales-orders'
                className='h-11 rounded-2xl border-none bg-muted/50 font-mono text-[13px] shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20'
              />
            </div>
          </div>

          <div className='grid gap-2'>
            <label className='text-[11px] font-black uppercase tracking-widest text-muted-foreground'>
              {t('basicSettings.knowledgeBase.editor.fields.summary')}
            </label>
            <Input
              value={draft.summary}
              onChange={(event) => updateDraft({ summary: event.target.value })}
              className='h-11 rounded-2xl border-none bg-muted/50 text-[13px] font-bold shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20'
            />
          </div>

          <div className='grid gap-2'>
            <label className='text-[11px] font-black uppercase tracking-widest text-muted-foreground'>
              {t('basicSettings.knowledgeBase.editor.fields.content')}
            </label>
            <KnowledgeBaseRichTextField
              value={draft.content}
              onChange={(content) => updateDraft({ content })}
              className='min-h-36 text-[13px] leading-6'
            />
          </div>

          <div className='grid gap-2'>
            <label className='text-[11px] font-black uppercase tracking-widest text-muted-foreground'>
              {t('basicSettings.knowledgeBase.editor.fields.keywords')}
            </label>
            <Input
              value={serializeKnowledgeKeywords(draft.keywords)}
              onChange={(event) =>
                updateDraft({ keywords: normalizeKnowledgeKeywords(event.target.value) })
              }
              className='h-11 rounded-2xl border-none bg-muted/50 text-[13px] font-bold shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20'
            />
          </div>
        </div>

        <div className='flex justify-end gap-3 border-t border-dashed border-muted/50 bg-muted/20 px-6 py-4'>
          <Button variant='outline' className='h-10 rounded-full px-5 font-bold shadow-sm' onClick={onClose}>
            {t('common.actions.cancel')}
          </Button>
          <Button className='h-10 rounded-full px-6 font-black shadow-sm' onClick={onSave} disabled={isSaving}>
            <Save className='mr-2 size-4' />
            {t('common.actions.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
