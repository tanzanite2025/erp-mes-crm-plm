import { useMemo } from 'react'
import { type Supplier, type SupplierStatus } from '../data/schema'

interface SupplierActionViewModelOptions {
  supplier?: Supplier | null
  t: (key: string) => string
}

interface SupplierOption {
  value: string
  label: string
}

const DEFAULT_CATEGORY = '鍘熸潗鏂?'
const DEFAULT_FORM_DATA: Partial<Supplier> = {
  name: '',
  code: '',
  category: DEFAULT_CATEGORY,
  mainProducts: [],
  contactPerson: '',
  contactPhone: '',
  email: '',
  address: '',
  status: 'Active',
  rating: 5,
}

export function useSupplierActionViewModel({ supplier, t }: SupplierActionViewModelOptions) {
  const initialFormData = useMemo(() => (supplier ? supplier : DEFAULT_FORM_DATA), [supplier])
  const categoryOptions = useMemo<SupplierOption[]>(
    () => [
      { value: '鍘熸潗鏂?', label: t('purchase.suppliers.categories.rawMaterial') },
      { value: '鏍囧噯浠?', label: t('purchase.suppliers.categories.standardPart') },
      { value: '澶栧崗鍔犲伐', label: t('purchase.suppliers.categories.outsourcing') },
      { value: '璁惧宸ヨ', label: t('purchase.suppliers.categories.equipmentTooling') },
    ],
    [t]
  )
  const statusOptions = useMemo(
    () =>
      [
        { value: 'Active', label: t('purchase.suppliers.statusActive') },
        { value: 'OnReview', label: t('purchase.suppliers.statusReview') },
        { value: 'Inactive', label: t('purchase.suppliers.statusInactive') },
      ] satisfies Array<{ value: SupplierStatus; label: string }>,
    [t]
  )

  return {
    initialFormData,
    categoryOptions,
    statusOptions,
  }
}
