import { useMemo, useState, type FormEvent } from 'react'
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
  SaveSidebarCommandCategoryPayload,
  SidebarCommandCategoryDto,
} from '../api/shared'

type CommandCategoryFormDialogProps = {
  open: boolean
  category: SidebarCommandCategoryDto | null
  defaultSortOrder: number
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: SaveSidebarCommandCategoryPayload) => void
}

type CategoryFormState = {
  categoryId: string
  name: string
  description: string
  enabled: boolean
  status: string
  sortOrder: string
}

function buildInitialState(
  category: SidebarCommandCategoryDto | null,
  defaultSortOrder: number
): CategoryFormState {
  if (category) {
    return {
      categoryId: category.categoryId,
      name: category.name,
      description: category.description,
      enabled: category.enabled,
      status: category.status || 'active',
      sortOrder: String(category.sortOrder),
    }
  }

  return {
    categoryId: '',
    name: '',
    description: '',
    enabled: true,
    status: 'active',
    sortOrder: String(defaultSortOrder),
  }
}

export function CommandCategoryFormDialog({
  open,
  category,
  defaultSortOrder,
  isSaving,
  onOpenChange,
  onSubmit,
}: CommandCategoryFormDialogProps) {
  const { t } = useLanguage()
  const [form, setForm] = useState<CategoryFormState>(() =>
    buildInitialState(category, defaultSortOrder)
  )
  const isEditing = Boolean(category)

  const canSubmit = useMemo(
    () => form.categoryId.trim() !== '' && form.name.trim() !== '',
    [form.categoryId, form.name]
  )

  const updateField = <Key extends keyof CategoryFormState>(
    key: Key,
    value: CategoryFormState[Key]
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit({
      categoryId: form.categoryId.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      enabled: form.enabled,
      status: form.enabled ? form.status || 'active' : 'disabled',
      sortOrder: Number(form.sortOrder) || defaultSortOrder,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size='lg'>
        <DialogHeader>
          <DialogTitle className='text-base font-black tracking-tight'>
            {isEditing
              ? t('sidebarCommandConfig.categoryForm.editTitle')
              : t('sidebarCommandConfig.categoryForm.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('sidebarCommandConfig.categoryForm.description')}
          </DialogDescription>
        </DialogHeader>

        <form className='space-y-5' onSubmit={handleSubmit}>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='sidebar-command-category-id'>
                {t('sidebarCommandConfig.categoryForm.categoryId')}
              </Label>
              <Input
                id='sidebar-command-category-id'
                value={form.categoryId}
                disabled={isEditing}
                placeholder={t(
                  'sidebarCommandConfig.categoryForm.categoryIdPlaceholder'
                )}
                onChange={(event) =>
                  updateField('categoryId', event.target.value)
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='sidebar-command-category-name'>
                {t('sidebarCommandConfig.categoryForm.name')}
              </Label>
              <Input
                id='sidebar-command-category-name'
                value={form.name}
                placeholder={t(
                  'sidebarCommandConfig.categoryForm.namePlaceholder'
                )}
                onChange={(event) => updateField('name', event.target.value)}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='sidebar-command-category-description'>
              {t('sidebarCommandConfig.categoryForm.categoryDescription')}
            </Label>
            <Textarea
              id='sidebar-command-category-description'
              value={form.description}
              placeholder={t(
                'sidebarCommandConfig.categoryForm.descriptionPlaceholder'
              )}
              onChange={(event) =>
                updateField('description', event.target.value)
              }
            />
          </div>

          <div className='grid gap-4 md:grid-cols-[1fr_160px_auto] md:items-end'>
            <div className='space-y-2'>
              <Label>{t('sidebarCommandConfig.categoryForm.status')}</Label>
              <Select
                value={form.status}
                onValueChange={(value) => updateField('status', value)}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='active'>
                    {t('sidebarCommandConfig.categoryForm.activeStatus')}
                  </SelectItem>
                  <SelectItem value='disabled'>
                    {t('sidebarCommandConfig.categoryForm.disabledStatus')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='sidebar-command-category-sort'>
                {t('sidebarCommandConfig.categoryForm.sortOrder')}
              </Label>
              <Input
                id='sidebar-command-category-sort'
                type='number'
                value={form.sortOrder}
                onChange={(event) =>
                  updateField('sortOrder', event.target.value)
                }
              />
            </div>
            <label className='flex h-11 items-center gap-3 rounded-full border border-dashed border-muted/60 px-4 text-xs font-black'>
              <Switch
                checked={form.enabled}
                onCheckedChange={(value) => updateField('enabled', value)}
              />
              {t('sidebarCommandConfig.categoryForm.enabled')}
            </label>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              {t('sidebarCommandConfig.categoryForm.cancel')}
            </Button>
            <Button type='submit' disabled={!canSubmit || isSaving}>
              <Save className='size-4' />
              {isSaving
                ? t('sidebarCommandConfig.categoryForm.saving')
                : t('sidebarCommandConfig.categoryForm.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
