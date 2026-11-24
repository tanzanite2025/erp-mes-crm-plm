// Shared by the product form and creation guide step 3. Keep compact controls
// readable without increasing the dialog size or scaling the whole form.
export const productFormTypographyClassNames = {
  fieldLabel: 'min-w-0 text-xs leading-5 font-semibold tracking-normal',
  control: 'control-typography min-w-0 [&_[data-slot=select-value]]:min-w-0',
  helper: 'text-xs leading-5 font-normal tracking-normal',
  sectionTitle: 'text-sm leading-5 font-semibold tracking-normal',
  badge:
    'max-w-full text-xs leading-4 font-medium tracking-normal break-words whitespace-normal',
  button: 'control-typography',
  preview: 'text-sm leading-5 font-semibold tracking-normal',
} as const
