import { type TranslationKey } from '@/locales'
import { type BOMFieldBusinessMeaningHelpTopic } from '../../data/bom-field-business-meaning-help-topic-definitions'
import { type BOM } from '../../data/schema'

type BOMProductConfigurationFieldName = Extract<
  keyof BOM,
  | 'bomNo'
  | 'productId'
  | 'bomType'
  | 'effectiveFrom'
  | 'ownerType'
  | 'ownerCustomerId'
>

export interface BOMProductConfigurationFieldContext {
  isEdit: boolean
  ownerType: BOM['ownerType']
  t: (key: TranslationKey) => string
  productItems: { label: string; value: string }[]
  ownerTypeItems: { label: string; value: string }[]
  customerItems: { label: string; value: string }[]
}

interface BOMProductConfigurationFieldBase {
  name: BOMProductConfigurationFieldName
  label: string
  placeholder?: string
  helpTopic?: BOMFieldBusinessMeaningHelpTopic
}

export type BOMProductConfigurationField = BOMProductConfigurationFieldBase &
  (
    | { type: 'effective-date' }
    | {
        type: 'input'
        inputType?: 'text' | 'date'
        readOnly?: boolean
        className?: string
        getDisplayValue?: (
          value: unknown,
          context: BOMProductConfigurationFieldContext
        ) => string
        transformOnChange?: (value: string) => string
      }
    | {
        type: 'select'
        getItems: (
          context: BOMProductConfigurationFieldContext
        ) => { label: string; value: string }[]
        isDisabled?: (context: BOMProductConfigurationFieldContext) => boolean
      }
  )

/** Product and ownership fields only. Performance configuration and lifecycle have their own components. */
export function getBOMProductConfigurationFields(
  context: BOMProductConfigurationFieldContext
): BOMProductConfigurationField[] {
  return [
    {
      name: 'productId',
      label: context.t('engineering.bomArchive.form.product'),
      type: 'select',
      placeholder: context.t('engineering.bomArchive.form.productPlaceholder'),
      getItems: (options) => options.productItems,
      isDisabled: (options) => options.isEdit,
    },
    {
      name: 'bomNo',
      label: context.t('engineering.bomArchive.form.bomNo'),
      type: 'input',
      readOnly: true,
      placeholder: context.isEdit
        ? undefined
        : context.t('engineering.bomArchive.form.bomNoAutoPlaceholder'),
    },
    {
      name: 'bomType',
      helpTopic: 'bomType',
      label: context.t('engineering.bomArchive.form.bomType'),
      type: 'input',
      readOnly: true,
      className: 'bg-indigo-500/5 text-indigo-600 dark:text-indigo-400',
      getDisplayValue: (value, options) =>
        options.t(
          value === 'MBOM' ? 'engineering.dict.MBOM' : 'engineering.dict.EBOM'
        ),
    },
    {
      name: 'effectiveFrom',
      label: context.t('engineering.bomArchive.form.effectiveFrom'),
      type: 'effective-date',
    },
    {
      name: 'ownerType',
      helpTopic: 'ownership',
      label: context.t('engineering.bomArchive.form.ownerType'),
      type: 'select',
      placeholder: context.t(
        'engineering.bomArchive.form.ownerTypePlaceholder'
      ),
      getItems: (options) => options.ownerTypeItems,
    },
    {
      name: 'ownerCustomerId',
      helpTopic: 'ownership',
      label: context.t('engineering.bomArchive.form.ownerCustomer'),
      type: 'select',
      placeholder: context.t(
        'engineering.bomArchive.form.ownerCustomerPlaceholder'
      ),
      getItems: (options) => options.customerItems,
      isDisabled: (options) => options.ownerType !== 'CUSTOMER',
    },
  ]
}
