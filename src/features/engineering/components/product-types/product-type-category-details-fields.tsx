import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/select-dropdown'
import type { ProductTypeDialogFormState } from '../../hooks/use-product-type-dialog-form'
import { normalizeEngineeringProductTypeCode } from '../../utils/product-code-normalization'

type ProductTypeCategoryDetailsFieldsProps = Pick<
  ProductTypeDialogFormState,
  | 'form'
  | 'parentItems'
  | 'targetLevelLabel'
  | 'selectedParentMeta'
  | 'parentPathLabel'
  | 'hierarchyHint'
  | 'isCatalogLoading'
  | 'hasCatalogLoadError'
  | 'reloadProductCategoryDialogCatalog'
  | 'markCategoryCodeAsManuallyEdited'
>

export function ProductTypeCategoryDetailsFields({
  form,
  parentItems,
  targetLevelLabel,
  selectedParentMeta,
  parentPathLabel,
  hierarchyHint,
  isCatalogLoading,
  hasCatalogLoadError,
  reloadProductCategoryDialogCatalog,
  markCategoryCodeAsManuallyEdited,
}: ProductTypeCategoryDetailsFieldsProps) {
  const { t } = useLanguage()
  return (
    <section
      aria-labelledby='product-category-details-heading'
      className='min-w-0 space-y-4 rounded-2xl border bg-background p-4'
    >
      <h3
        id='product-category-details-heading'
        className='text-sm font-semibold'
      >
        {t('engineering.categoryArchive.dialog.categoryDetailsTitle')}
      </h3>
      <FormField
        control={form.control}
        name='parentId'
        render={({ field }) => (
          <FormItem className='min-w-0'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <FormLabel className='text-sm font-medium'>
                {t('engineering.categoryArchive.dialog.parent')}
              </FormLabel>
              <Badge
                variant='outline'
                className='rounded-full border-primary/20 bg-primary/5 font-medium text-primary'
              >
                {targetLevelLabel}
              </Badge>
            </div>
            <SelectDropdown
              value={field.value}
              // Radix may emit an empty value while registering native options.
              // Clearing the parent is an explicit choice of "root".
              onValueChange={(value) => {
                if (value) field.onChange(value)
              }}
              items={parentItems}
              placeholder={t(
                'engineering.categoryArchive.dialog.parentPlaceholder'
              )}
              isControlled={true}
              className='h-10 w-full min-w-0 rounded-xl bg-background text-sm [&_[data-slot=select-value]]:min-w-0'
            />
            <div className='space-y-1.5 rounded-xl bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground'>
              {selectedParentMeta && (
                <p className='break-words'>
                  <span className='font-medium text-foreground'>
                    {t('engineering.categoryArchive.dialog.parentPath')}：
                  </span>
                  {parentPathLabel}
                </p>
              )}
              <p>{hierarchyHint}</p>
            </div>
            {isCatalogLoading && (
              <p role='status' className='text-xs text-muted-foreground'>
                {t('engineering.categoryArchive.dialog.catalogLoading')}
              </p>
            )}
            {hasCatalogLoadError && (
              <div
                role='alert'
                className='space-y-2 text-xs leading-relaxed text-destructive'
              >
                <p>
                  {t('engineering.categoryArchive.dialog.catalogLoadFailed')}
                </p>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='rounded-full'
                  onClick={() => void reloadProductCategoryDialogCatalog()}
                >
                  {t('engineering.productCreationGuide.retry')}
                </Button>
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      <div className='grid gap-4 sm:grid-cols-2'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem className='min-w-0'>
              <FormLabel className='text-sm font-medium'>
                {t('engineering.categoryArchive.dialog.name')}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    'engineering.categoryArchive.dialog.namePlaceholder'
                  )}
                  className='h-10 rounded-xl bg-background'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='code'
          render={({ field }) => (
            <FormItem className='min-w-0'>
              <FormLabel className='text-sm font-medium'>
                {t('engineering.categoryArchive.dialog.code')}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t(
                    'engineering.categoryArchive.dialog.codePlaceholder'
                  )}
                  className='h-10 rounded-xl bg-background font-maple-ui'
                  {...field}
                  value={field.value || ''}
                  onChange={(event) => {
                    markCategoryCodeAsManuallyEdited()
                    field.onChange(
                      normalizeEngineeringProductTypeCode(event.target.value)
                    )
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name='description'
        render={({ field }) => (
          <FormItem className='min-w-0'>
            <FormLabel className='text-sm font-medium'>
              {t('engineering.categoryArchive.dialog.description')}
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder={t(
                  'engineering.categoryArchive.dialog.descriptionPlaceholder'
                )}
                className='min-h-20 resize-none rounded-xl bg-background'
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name='active'
        render={({ field }) => (
          <FormItem className='flex items-center justify-between gap-4 rounded-xl border bg-muted/30 px-3 py-3'>
            <div className='min-w-0 space-y-1'>
              <FormLabel className='text-sm font-medium'>
                {t('engineering.categoryArchive.dialog.active')}
              </FormLabel>
              <p className='text-xs leading-relaxed text-muted-foreground'>
                {t('engineering.categoryArchive.dialog.activeDescription')}
              </p>
            </div>
            <FormControl className='shrink-0'>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </section>
  )
}
