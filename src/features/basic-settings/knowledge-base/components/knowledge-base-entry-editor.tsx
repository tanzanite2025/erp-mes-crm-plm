import { useMemo, useState } from 'react'
import { type TranslationKey } from '@/locales'
import { Check, ChevronsUpDown, Save, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getKnowledgeRouteOptions } from '@/components/layout/data/search-data'
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
  const [routePickerOpen, setRoutePickerOpen] = useState(false)
  const [routeSearch, setRouteSearch] = useState('')

  const routeOptions = useMemo(() => getKnowledgeRouteOptions(t), [t])
  const routeOptionsForSelect = useMemo(() => {
    const currentRouteOption = routeOptions.find(
      (option) => option.value === draft.routePath
    )

    if (currentRouteOption || !draft.routePath) {
      return routeOptions
    }

    return [
      ...routeOptions,
      {
        value: draft.routePath,
        label: t(
          'basicSettings.knowledgeBase.editor.routeOptions.unlistedCurrent'
        ),
        parentLabel: t(
          'basicSettings.knowledgeBase.editor.routeOptions.legacyRoute'
        ),
      },
    ]
  }, [draft.routePath, routeOptions, t])
  const filteredRouteOptions = useMemo(() => {
    const normalizedQuery = routeSearch.trim().toLowerCase()

    if (!normalizedQuery) return routeOptionsForSelect

    return routeOptionsForSelect.filter((option) =>
      `${option.label} ${option.parentLabel} ${option.value}`
        .toLowerCase()
        .includes(normalizedQuery)
    )
  }, [routeOptionsForSelect, routeSearch])
  const selectedRouteOption = useMemo(
    () =>
      draft.routePath
        ? (routeOptionsForSelect.find(
            (option) => option.value === draft.routePath
          ) ?? null)
        : null,
    [draft.routePath, routeOptionsForSelect]
  )

  if (!open) return null

  const updateDraft = (patch: Partial<KnowledgeBaseDraft>) => {
    onDraftChange({ ...draft, ...patch })
  }

  const handleRoutePickerOpenChange = (nextOpen: boolean) => {
    setRoutePickerOpen(nextOpen)
    if (!nextOpen) {
      setRouteSearch('')
    }
  }

  const handleRouteSelect = (value: string) => {
    updateDraft({ routePath: value })
    setRoutePickerOpen(false)
    setRouteSearch('')
  }

  return (
    <div className='fixed inset-0 z-160 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm'>
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
          <Button
            variant='ghost'
            size='icon'
            className='size-9 rounded-full'
            onClick={onClose}
          >
            <X className='size-4' />
          </Button>
        </div>

        <div className='grid gap-4 overflow-y-auto px-6 py-5'>
          <div className='grid gap-2'>
            <label className='text-[11px] font-black tracking-widest text-muted-foreground uppercase'>
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
              <label className='text-[11px] font-black tracking-widest text-muted-foreground uppercase'>
                {t('basicSettings.knowledgeBase.editor.fields.category')}
              </label>
              <select
                value={draft.category}
                onChange={(event) =>
                  updateDraft({
                    category: event.target
                      .value as KnowledgeBaseDraft['category'],
                  })
                }
                className='h-11 rounded-2xl border-none bg-muted/50 px-3 text-[13px] font-bold shadow-inner outline-none focus:ring-1 focus:ring-primary/20'
              >
                {KNOWLEDGE_BASE_CATEGORIES.filter(
                  (item) => item.value !== 'all'
                ).map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(item.labelKey as TranslationKey)}
                  </option>
                ))}
              </select>
            </div>
            <div className='grid gap-2'>
              <label className='text-[11px] font-black tracking-widest text-muted-foreground uppercase'>
                {t('basicSettings.knowledgeBase.editor.fields.routePath')}
              </label>
              <Popover
                open={routePickerOpen}
                onOpenChange={handleRoutePickerOpenChange}
              >
                <PopoverTrigger asChild>
                  <Button
                    type='button'
                    variant='outline'
                    role='combobox'
                    aria-expanded={routePickerOpen}
                    className='h-12 w-full justify-between rounded-2xl border-none bg-muted/50 px-4 text-left text-[13px] font-bold shadow-inner hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-primary/20'
                  >
                    <div className='min-w-0 flex-1 text-left'>
                      <div
                        className={cn(
                          'truncate text-[13px] font-bold',
                          !selectedRouteOption && 'text-muted-foreground'
                        )}
                      >
                        {selectedRouteOption
                          ? `${selectedRouteOption.label} / ${selectedRouteOption.parentLabel}`
                          : t(
                              'basicSettings.knowledgeBase.editor.routeOptions.placeholder'
                            )}
                      </div>
                    </div>
                    <ChevronsUpDown className='ml-3 size-4 shrink-0 opacity-45' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align='start'
                  sideOffset={8}
                  className='z-170 w-[720px] max-w-[calc(100vw-2rem)] rounded-[24px] border-dashed border-muted/50 bg-background p-0 shadow-2xl'
                >
                  <div className='border-b border-dashed border-muted/50 bg-muted/10 p-2.5'>
                    <div className='relative'>
                      <Search className='pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground/45' />
                      <Input
                        value={routeSearch}
                        onChange={(event) => setRouteSearch(event.target.value)}
                        placeholder={t(
                          'basicSettings.knowledgeBase.editor.routeOptions.searchPlaceholder'
                        )}
                        className='h-9 rounded-2xl border-none bg-muted/50 pl-9 text-[11px] font-bold shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20'
                      />
                    </div>
                  </div>
                  <div className='border-b border-dashed border-muted/50 p-2.5'>
                    <button
                      type='button'
                      onClick={() => handleRouteSelect('')}
                      className={cn(
                        'flex w-full items-center justify-between rounded-[18px] border border-dashed px-3.5 py-2.5 text-left transition-colors',
                        !draft.routePath
                          ? 'border-primary/50 bg-primary/5 text-primary'
                          : 'border-muted/50 bg-muted/10 hover:bg-muted/30'
                      )}
                    >
                      <span className='text-[11px] font-black tracking-widest uppercase'>
                        {t(
                          'basicSettings.knowledgeBase.editor.routeOptions.none'
                        )}
                      </span>
                      <Check
                        className={cn(
                          'size-4',
                          !draft.routePath ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </button>
                  </div>
                  <div className='max-h-[420px] overflow-y-auto p-2.5'>
                    {filteredRouteOptions.length === 0 ? (
                      <div className='flex min-h-24 items-center justify-center rounded-[18px] border border-dashed border-muted/50 bg-muted/10 px-4 text-center'>
                        <span className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                          {t(
                            'basicSettings.knowledgeBase.editor.routeOptions.empty'
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
                        {filteredRouteOptions.map((option) => (
                          <button
                            key={option.value}
                            type='button'
                            onClick={() => handleRouteSelect(option.value)}
                            className={cn(
                              'group flex flex-col rounded-[16px] border border-dashed px-3 py-2 text-left transition-colors',
                              draft.routePath === option.value
                                ? 'border-primary/50 bg-primary/5'
                                : 'border-muted/50 bg-muted/10 hover:bg-muted/30'
                            )}
                          >
                            <div className='flex items-start justify-between gap-2'>
                              <div className='min-w-0 space-y-0.5'>
                                <div className='truncate text-[12px] leading-none font-black tracking-tight'>
                                  {option.label}
                                </div>
                                <div className='truncate text-[8px] leading-none font-black tracking-[0.14em] text-muted-foreground/55 uppercase'>
                                  {option.parentLabel}
                                </div>
                              </div>
                              <Check
                                className={cn(
                                  'size-4 shrink-0 transition-opacity',
                                  draft.routePath === option.value
                                    ? 'text-primary opacity-100'
                                    : 'text-muted-foreground opacity-0 group-hover:opacity-40'
                                )}
                              />
                            </div>
                            <div className='mt-1 truncate font-mono text-[8px] leading-none text-muted-foreground/70'>
                              {option.value}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className='grid gap-2'>
            <label className='text-[11px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('basicSettings.knowledgeBase.editor.fields.summary')}
            </label>
            <Input
              value={draft.summary}
              onChange={(event) => updateDraft({ summary: event.target.value })}
              className='h-11 rounded-2xl border-none bg-muted/50 text-[13px] font-bold shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20'
            />
          </div>

          <div className='grid gap-2'>
            <label className='text-[11px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('basicSettings.knowledgeBase.editor.fields.content')}
            </label>
            <KnowledgeBaseRichTextField
              value={draft.content}
              onChange={(content) => updateDraft({ content })}
              className='min-h-36 text-[13px] leading-6'
            />
          </div>

          <div className='grid gap-2'>
            <label className='text-[11px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('basicSettings.knowledgeBase.editor.fields.keywords')}
            </label>
            <Input
              value={serializeKnowledgeKeywords(draft.keywords)}
              onChange={(event) =>
                updateDraft({
                  keywords: normalizeKnowledgeKeywords(event.target.value),
                })
              }
              className='h-11 rounded-2xl border-none bg-muted/50 text-[13px] font-bold shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20'
            />
          </div>
        </div>

        <div className='flex justify-end gap-3 border-t border-dashed border-muted/50 bg-muted/20 px-6 py-4'>
          <Button
            variant='outline'
            className='h-10 rounded-full px-5 font-bold shadow-sm'
            onClick={onClose}
          >
            {t('common.actions.cancel')}
          </Button>
          <Button
            className='h-10 rounded-full px-6 font-black shadow-sm'
            onClick={onSave}
            disabled={isSaving}
          >
            <Save className='mr-2 size-4' />
            {t('common.actions.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
