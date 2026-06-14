import { z } from 'zod'
import { SALES_ANALYTICS_PRODUCT_DISPLAY_STRATEGY_VERSION } from './sales-analytics-product-display'

export const salesAnalyticsProductDisplayApiDTOSchema = z
  .object({
    title: z.string(),
    subtitle: z.string(),
    code: z.string(),
    fullLabel: z.string(),
    strategyVersion: z.literal(
      SALES_ANALYTICS_PRODUCT_DISPLAY_STRATEGY_VERSION
    ),
  })
  .strict()

export const salesAnalyticsProductStatApiDTOSchema = z
  .object({
    productId: z.string(),
    productDisplay: salesAnalyticsProductDisplayApiDTOSchema,
    totalQty: z.number(),
    orderCount: z.number(),
    totalAmount: z.number(),
  })
  .strict()

export const customerAnalyticsApiDTOSchema = z
  .object({
    customerId: z.string(),
    customerName: z.string(),
    totalOrders: z.number(),
    totalAmount: z.number(),
    products: z.array(salesAnalyticsProductStatApiDTOSchema),
  })
  .strict()

export const customerAnalyticsListResponseApiDTOSchema = z
  .object({
    items: z.array(customerAnalyticsApiDTOSchema),
    total: z.number(),
  })
  .strict()

export const globalProductRankingResponseApiDTOSchema = z
  .object({
    items: z.array(salesAnalyticsProductStatApiDTOSchema),
    total: z.number(),
  })
  .strict()

export type SalesAnalyticsProductDisplayApiDTO = z.infer<
  typeof salesAnalyticsProductDisplayApiDTOSchema
>

export type SalesAnalyticsProductStatApiDTO = z.infer<
  typeof salesAnalyticsProductStatApiDTOSchema
>

export type CustomerAnalyticsApiDTO = z.infer<
  typeof customerAnalyticsApiDTOSchema
>

export type CustomerAnalyticsListResponseApiDTO = z.infer<
  typeof customerAnalyticsListResponseApiDTOSchema
>

export type GlobalProductRankingResponseApiDTO = z.infer<
  typeof globalProductRankingResponseApiDTOSchema
>

export function deserializeCustomerAnalyticsListResponseApiDTO(
  input: unknown
): CustomerAnalyticsListResponseApiDTO {
  return customerAnalyticsListResponseApiDTOSchema.parse(input)
}

export function deserializeGlobalProductRankingResponseApiDTO(
  input: unknown
): GlobalProductRankingResponseApiDTO {
  return globalProductRankingResponseApiDTOSchema.parse(input)
}
