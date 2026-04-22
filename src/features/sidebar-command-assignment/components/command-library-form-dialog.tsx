import { useMemo, useState, type FormEvent } from 'react'
import type { TranslationKey } from '@/locales'
import { Save } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type {
  SaveSidebarCommandDefinitionPayload,
  SidebarCommandCategoryDto,
  SidebarCommandDefinitionDto,
} from '../services'

type CommandLibraryFormDialogProps = {
  open: boolean
  command: SidebarCommandDefinitionDto | null
  categories: SidebarCommandCategoryDto[]
  defaultSortOrder: number
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: SaveSidebarCommandDefinitionPayload) => void
}

type CommandFormState = {
  commandId: string
  title: string
  description: string
  route: string
  searchParamsText: string
  icon: string
  category: string
  assignable: boolean
  enabled: boolean
  status: string
  sortOrder: string
}

const defaultIconOptions: Array<{
  value: string
  labelKey: TranslationKey
}> = [
  {
    value: 'SearchCheck',
    labelKey: 'sidebarCommandAssignment.form.icons.trace',
  },
  {
    value: 'PackagePlus',
    labelKey: 'sidebarCommandAssignment.form.icons.inbound',
  },
  { value: 'ScanLine', labelKey: 'sidebarCommandAssignment.form.icons.scan' },
  {
    value: 'ClipboardCheck',
    labelKey: 'sidebarCommandAssignment.form.icons.stocktake',
  },
]

function buildInitialState(
  command: SidebarCommandDefinitionDto | null,
  defaultSortOrder: number
): CommandFormState {
  if (command) {
    return {
      commandId: command.commandId,
      title: command.title,
      description: command.description,
      route: command.route,
      searchParamsText: JSON.stringify(command.searchParams ?? {}, null, 2),
      icon: command.icon || 'SearchCheck',
      category: command.category || 'business',
      assignable: command.assignable,
      enabled: command.enabled,
      status: command.status || 'active',
      sortOrder: String(command.sortOrder),
    }
  }

  return {
    commandId: '',
    title: '',
    description: '',
    route: '',
    searchParamsText: '{\n  "mode": "scan"\n}',
    icon: 'SearchCheck',
    category: 'business',
    assignable: true,
    enabled: true,
    status: 'active',
    sortOrder: String(defaultSortOrder),
  }
}

export function CommandLibraryFormDialog({
  open,
  command,
  categories,
  defaultSortOrder,
  isSaving,
  onOpenChange,
  onSubmit,
}: CommandLibraryFormDialogProps) {
  const { t } = useLanguage()
  const [form, setForm] = useState<CommandFormState>(() =>
    buildInitialState(command, defaultSortOrder)
  )
  const [paramsError, setParamsError] = useState('')
  const isEditing = Boolean(command)

  const title = isEditing
    ? t('sidebarCommandAssignment.form.editTitle')
    : t('sidebarCommandAssignment.form.createTitle')
  const canSubmit = useMemo(() => {
    return (
      form.commandId.trim() !== '' &&
      form.title.trim() !== '' &&
      form.route.trim().startsWith('/')
    )
  }, [form.commandId, form.route, form.title])
  const categoryOptions = useMemo(() => {
    const source = categories.length
      ? categories
      : [
          {
            categoryId: 'business',
            name: t('sidebarCommandAssignment.form.defaultCategory'),
          },
        ]
    const options = source.map((category) => ({
      value: category.categoryId,
      label: category.name,
    }))
    if (
      form.category &&
      !options.some((option) => option.value === form.category)
    ) {
      options.push({ value: form.category, label: form.category })
    }
    return options
  }, [categories, form.category, t])

  const updateField = <Key extends keyof CommandFormState>(
    key: Key,
    value: CommandFormState[Key]
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setParamsError('')

    let searchParams: unknown
    try {
      searchParams = JSON.parse(form.searchParamsText || '{}')
    } catch {
      setParamsError(t('sidebarCommandAssignment.form.paramsInvalidJson'))
      return
    }

    if (
      typeof searchParams !== 'object' ||
      searchParams === null ||
      Array.isArray(searchParams)
    ) {
      setParamsError(t('sidebarCommandAssignment.form.paramsMustObject'))
      return
    }

    onSubmit({
      commandId: form.commandId.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      route: form.route.trim(),
      searchParams: searchParams as Record<string, unknown>,
      icon: form.icon,
      category: form.category.trim() || 'business',
      assignable: form.assignable,
      enabled: form.enabled,
      status: form.enabled ? form.status || 'active' : 'disabled',
      sortOrder: Number(form.sortOrder) || defaultSortOrder,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='2xl'>
        <DialogHeader>
          <DialogTitle className='text-base font-black tracking-tight'>
            {title}
          </DialogTitle>
          <DialogDescription>
            {t('sidebarCommandAssignment.form.description')}
          </DialogDescription>
        </DialogHeader>

        <form className='space-y-5' onSubmit={handleSubmit}>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='sidebar-command-id'>
                {t('sidebarCommandAssignment.form.commandId')}
              </Label>
              <Input
                id='sidebar-command-id'
                value={form.commandId}
                disabled={isEditing}
                placeholder={t(
                  'sidebarCommandAssignment.form.commandIdPlaceholder'
                )}
                onChange={(event) =>
                  updateField('commandId', event.target.value)
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='sidebar-command-title'>
                {t('sidebarCommandAssignment.form.title')}
              </Label>
              <Input
                id='sidebar-command-title'
                value={form.title}
                placeholder={t(
                  'sidebarCommandAssignment.form.titlePlaceholder'
                )}
                onChange={(event) => updateField('title', event.target.value)}
              />
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]'>
            <div className='space-y-2'>
              <Label htmlFor='sidebar-command-route'>
                {t('sidebarCommandAssignment.form.route')}
              </Label>
              <Input
                id='sidebar-command-route'
                value={form.route}
                placeholder={t(
                  'sidebarCommandAssignment.form.routePlaceholder'
                )}
                onChange={(event) => updateField('route', event.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='sidebar-command-sort'>
                {t('sidebarCommandAssignment.form.sortOrder')}
              </Label>
              <Input
                id='sidebar-command-sort'
                type='number'
                value={form.sortOrder}
                onChange={(event) =>
                  updateField('sortOrder', event.target.value)
                }
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='sidebar-command-description'>
              {t('sidebarCommandAssignment.form.commandDescription')}
            </Label>
            <Textarea
              id='sidebar-command-description'
              value={form.description}
              placeholder={t(
                'sidebarCommandAssignment.form.descriptionPlaceholder'
              )}
              onChange={(event) =>
                updateField('description', event.target.value)
              }
            />
          </div>

          <div className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label>{t('sidebarCommandAssignment.form.icon')}</Label>
              <Select
                value={form.icon}
                onValueChange={(value) => updateField('icon', value)}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {defaultIconOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>{t('sidebarCommandAssignment.form.category')}</Label>
              <Select
                value={form.category}
                onValueChange={(value) => updateField('category', value)}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>{t('sidebarCommandAssignment.form.status')}</Label>
              <Select
                value={form.status}
                onValueChange={(value) => updateField('status', value)}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='active'>
                    {t('sidebarCommandAssignment.form.activeStatus')}
                  </SelectItem>
                  <SelectItem value='disabled'>
                    {t('sidebarCommandAssignment.form.disabledStatus')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end'>
            <div className='space-y-2'>
              <Label htmlFor='sidebar-command-params'>
                {t('sidebarCommandAssignment.form.params')}
              </Label>
              <Textarea
                id='sidebar-command-params'
                className='min-h-28 font-mono text-xs'
                value={form.searchParamsText}
                onChange={(event) => {
                  updateField('searchParamsText', event.target.value)
                  setParamsError('')
                }}
              />
              {paramsError ? (
                <p className='text-xs font-bold text-destructive'>
                  {paramsError}
                </p>
              ) : null}
            </div>
            <label className='flex h-11 items-center gap-3 rounded-full border border-dashed border-muted/60 px-4 text-xs font-black'>
              <Switch
                checked={form.assignable}
                onCheckedChange={(value) => updateField('assignable', value)}
              />
              {t('sidebarCommandAssignment.form.assignable')}
            </label>
            <label className='flex h-11 items-center gap-3 rounded-full border border-dashed border-muted/60 px-4 text-xs font-black'>
              <Switch
                checked={form.enabled}
                onCheckedChange={(value) => updateField('enabled', value)}
              />
              {t('sidebarCommandAssignment.form.enabled')}
            </label>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              {t('sidebarCommandAssignment.form.cancel')}
            </Button>
            <Button type='submit' disabled={!canSubmit || isSaving}>
              <Save className='size-4' />
              {isSaving
                ? t('sidebarCommandAssignment.form.saving')
                : t('sidebarCommandAssignment.form.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
