import { useMemo } from 'react'
import type { TranslationKey } from '@/locales'
import {
  type Supplier,
  type SupplierFormValues,
  type SupplierStatus,
} from '../data/schema'

interface SupplierActionViewModelOptions {
  supplier?: Supplier | null
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

interface SupplierOption {
  value: string
  label: string
}

const DEFAULT_CATEGORY = '原材料'
const DEFAULT_FORM_DATA: SupplierFormValues = {
  name: '',
  code: '', // 将由后端自动生成
  category: DEFAULT_CATEGORY,
  mainProducts: [],
  contactPerson: '',
  contactPhone: '',
  wechat: '',
  whatsapp: '',
  facebook: '',
  instagram: '',
  telegram: '',
  email: '',
  address: '',
  status: 'Active',
  rating: 5,
}

export function useSupplierActionViewModel({
  supplier,
  t,
}: SupplierActionViewModelOptions) {
  const initialFormData = useMemo<SupplierFormValues>(
    () =>
      supplier
        ? {
            name: supplier.name,
            code: supplier.code,
            category: supplier.category,
            mainProducts: supplier.mainProducts,
            contactPerson: supplier.contactPerson,
            contactPhone: supplier.contactPhone,
            wechat: supplier.wechat,
            whatsapp: supplier.whatsapp,
            facebook: supplier.facebook,
            instagram: supplier.instagram,
            telegram: supplier.telegram,
            email: supplier.email,
            address: supplier.address,
            status: supplier.status,
            rating: supplier.rating,
          }
        : DEFAULT_FORM_DATA,
    [supplier]
  )
  const categoryOptions = useMemo<SupplierOption[]>(
    () => [
      {
        value: '原材料',
        label: t('purchase.suppliers.categories.rawMaterial'),
      },
      {
        value: '标准件',
        label: t('purchase.suppliers.categories.standardPart'),
      },
      {
        value: '外协加工',
        label: t('purchase.suppliers.categories.outsourcing'),
      },
      {
        value: '设备工装',
        label: t('purchase.suppliers.categories.equipmentTooling'),
      },
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
