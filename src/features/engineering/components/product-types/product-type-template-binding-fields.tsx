import { useLanguage } from '@/context/language-provider'
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { SelectDropdown } from '@/components/select-dropdown'
import type { ProductTypeDialogFormState } from '../../hooks/use-product-type-dialog-form'

type ProductTypeTemplateBindingFieldsProps = Pick<
  ProductTypeDialogFormState,
  'form' | 'localizedTemplates' | 'selectedTemplate' | 'templateAssembly'
>

export function ProductTypeTemplateBindingFields({
  form,
  localizedTemplates,
  selectedTemplate,
  templateAssembly,
}: ProductTypeTemplateBindingFieldsProps) {
  const { t } = useLanguage()
  return (
    <section
      aria-labelledby='product-category-template-heading'
      className='min-w-0 space-y-4 rounded-2xl border bg-background p-4'
    >
      <h3
        id='product-category-template-heading'
        className='text-sm font-semibold'
      >
        {t('engineering.categoryArchive.dialog.templateConfigurationTitle')}
      </h3>
      <FormField
        control={form.control}
        name='templateId'
        render={({ field }) => (
          <FormItem className='min-w-0'>
            <FormLabel className='text-sm font-medium'>
              {t('engineering.categoryArchive.dialog.template')}
            </FormLabel>
            <SelectDropdown
              value={field.value}
              // "none" remains the explicit way to remove a template binding.
              onValueChange={(value) => {
                if (value) field.onChange(value)
              }}
              items={[
                {
                  label: t('engineering.categoryArchive.dialog.templateNone'),
                  value: 'none',
                },
                ...localizedTemplates.map((template) => ({
                  label: template.name,
                  value: template.id,
                })),
              ]}
              placeholder={t(
                'engineering.categoryArchive.dialog.templatePlaceholder'
              )}
              isControlled={true}
              className='h-10 w-full min-w-0 rounded-xl bg-background text-sm [&_[data-slot=select-value]]:min-w-0'
            />
            <div className='text-xs leading-relaxed text-muted-foreground'>
              {t('engineering.categoryArchive.dialog.templateHelp')}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className='space-y-3 rounded-xl border border-dashed bg-muted/20 p-3 sm:p-4'>
        <div className='text-sm font-medium'>
          {t('engineering.categoryArchive.dialog.templateAssemblyTitle')}
        </div>
        <div className='text-xs leading-relaxed text-muted-foreground'>
          {selectedTemplate
            ? t('engineering.categoryArchive.dialog.templateAssemblyCount', {
                count: templateAssembly.length,
              })
            : t(
                'engineering.categoryArchive.dialog.templatePreviewPlaceholder'
              )}
        </div>

        {selectedTemplate ? (
          <div className='flex flex-wrap gap-2'>
            {templateAssembly.length === 0 ? (
              <div className='text-xs leading-relaxed text-muted-foreground'>
                {t('engineering.categoryArchive.dialog.templateAssemblyEmpty')}
              </div>
            ) : (
              templateAssembly.map((binding) => (
                <div
                  key={binding.categoryKey}
                  className='max-w-full rounded-full border bg-background px-3 py-1.5 text-xs break-words'
                >
                  {binding.categoryKey}
                  {' · '}
                  {binding.required
                    ? t(
                        'engineering.categoryArchive.dialog.templateAssemblyRequired'
                      )
                    : t(
                        'engineering.categoryArchive.dialog.templateAssemblyOptional'
                      )}
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
