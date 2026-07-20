import { z } from 'zod'

const baseSupplierSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isDeleted: z.boolean(),
})

export type SupplierStatus = 'Active' | 'Inactive' | 'OnReview'

export const supplierSchema = baseSupplierSchema.extend({
  name: z.string(),
  code: z.string(),
  category: z.string(),
  mainProducts: z.array(z.string()),
  contactPerson: z.string(),
  contactPhone: z.string(),
  wechat: z.string(),
  whatsapp: z.string(),
  facebook: z.string(),
  instagram: z.string(),
  telegram: z.string(),
  email: z.string(),
  address: z.string(),
  status: z.enum(['Active', 'Inactive', 'OnReview']),
  rating: z.number(),
  version: z.number(),
})

export type Supplier = z.infer<typeof supplierSchema>
export type SupplierFormValues = Omit<
  Supplier,
  'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'version'
>

export const supplierArraySchema = z.array(supplierSchema)
