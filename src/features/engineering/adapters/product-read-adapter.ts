import { createLogger } from '@/lib/logger'
import { barcodeConfigSchema, productSchema, type Product, type ProductAttributeValue } from '../data/schema'
import {
  type ProductApiDTO,
  type ProductAttributeValueApiDTO,
  type ProductListPageApiDTO,
} from '../contracts/product-api-dto'
import {
  normalizeEngineeringChangeOrderNo,
  normalizeEngineeringRevisionNo,
  normalizeEngineeringSiteCode,
  normalizeProductModelCodeValue,
  normalizeProductSkuValue,
  normalizeProductTemplateKeyValue,
} from '../utils/product-code-normalization'
import { normalizeProductAttributeMachineValue } from '../utils/product-attribute-machine-value'

const logger = createLogger('ProductReadAdapter')

export function toProductAttributeValueContract(dto: ProductAttributeValueApiDTO): ProductAttributeValue {
  return {
    id: dto.id,
    productId: dto.productId,
    categoryKey: dto.categoryKey,
    optionValue: normalizeProductAttributeMachineValue(dto.optionValue),
    sortOrder: dto.sortOrder ?? 0,
    version: dto.version ?? 1,
  }
}

function toAttachmentArray(value: unknown): Product['attachments'] {
  return Array.isArray(value) ? (value as Product['attachments']) : []
}

function toBarcodeConfig(value: unknown): Product['barcodeConfig'] {
  const parsed = barcodeConfigSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

export function buildProductCandidate(
  dto: ProductApiDTO,
  options?: {
    allowMissingCollections?: boolean
  }
) {
  const allowMissingCollections = options?.allowMissingCollections ?? false
  const restrictions = dto.restrictions ?? (allowMissingCollections ? [] : undefined)
  const attributeValues = dto.attributeValues ?? (allowMissingCollections ? [] : undefined)

  if (!restrictions) throw new Error('[CRITICAL] Missing restrictions array in Product DTO')
  if (!attributeValues) throw new Error('[CRITICAL] Missing attributeValues array in Product DTO')

  return {
    id: dto.id,
    sku: normalizeProductSkuValue(dto.sku),
    name: dto.name,
    modelCode: normalizeProductModelCodeValue(dto.modelCode),
    typeId: dto.typeId,
    depth: dto.depth,
    widthInternal: dto.widthInternal,
    widthExternal: dto.widthExternal,
    maxTirePressure: dto.maxTirePressure,
    weight: dto.weight,
    length: dto.length,
    angle: dto.angle,
    clamp: dto.clamp,
    offset: dto.offset,
    axleCrown: dto.axleCrown,
    steerer: dto.steerer,
    image: dto.image,
    restrictions,
    moldGroup: dto.moldGroup,
    description: dto.description,
    engineeringSpecId: dto.engineeringSpecId,
    attributeValues: attributeValues.map(toProductAttributeValueContract),
    techSpecs: dto.techSpecs,
    barcodeConfig: toBarcodeConfig(dto.barcodeConfig),
    attachments: toAttachmentArray(dto.attachments),
    status: dto.status ?? 'Active',
    ownerType: dto.ownerType ?? 'INTERNAL',
    ownerCustomerId: dto.ownerCustomerId,
    templateKey: normalizeProductTemplateKeyValue(dto.templateKey),
    resolvedTemplateId: dto.resolvedTemplateId?.trim() || undefined,
    resolvedTemplateKey: normalizeProductTemplateKeyValue(dto.resolvedTemplateKey),
    templateResolutionSource: dto.templateResolutionSource?.trim() || undefined,
    templateResolutionError: dto.templateResolutionError?.trim() || undefined,
    createdAt: dto.createdAt ?? '',
    version: dto.version ?? 1,
    masterDataControl: {
      revisionNo: normalizeEngineeringRevisionNo(dto.masterDataControl?.revisionNo ?? dto.revisionNo),
      effectiveFrom: dto.masterDataControl?.effectiveFrom ?? dto.effectiveFrom ?? undefined,
      effectiveTo: dto.masterDataControl?.effectiveTo ?? dto.effectiveTo ?? undefined,
      changeType: dto.masterDataControl?.changeType ?? dto.changeType,
      changeOrderNo: normalizeEngineeringChangeOrderNo(dto.masterDataControl?.changeOrderNo ?? dto.changeOrderNo),
      siteCode: normalizeEngineeringSiteCode(dto.masterDataControl?.siteCode ?? dto.siteCode),
      isDefaultSite: dto.masterDataControl?.isDefaultSite ?? dto.isDefaultSite,
    },
  }
}

export function toProductContract(dto: ProductApiDTO): Product {
  return productSchema.parse(buildProductCandidate(dto))
}

export function toProductArrayContract(items: ProductApiDTO[]): Product[] {
  return items.map(toProductContract)
}

export function toProductOptionsArrayContract(items: ProductApiDTO[]): Product[] {
  const validProducts: Product[] = []
  let skipped = 0

  items.forEach((item, index) => {
    const missingCollections = [
      !item.restrictions ? 'restrictions' : null,
      !item.attributeValues ? 'attributeValues' : null,
    ].filter(Boolean)

    if (missingCollections.length > 0) {
      logger.warn('Normalized missing product option collections during contract mapping', {
        index,
        id: item.id,
        name: item.name,
        missingCollections,
      })
    }

    const candidate = buildProductCandidate(item, { allowMissingCollections: true })
    const parsed = productSchema.safeParse(candidate)
    if (parsed.success) {
      validProducts.push(parsed.data)
      return
    }

    skipped += 1
    logger.warn('Skipped invalid product option during contract mapping', {
      index,
      id: item.id,
      name: item.name,
      rawSku: item.sku,
      normalizedSku: candidate.sku,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
        message: issue.message,
      })),
    })
  })

  if (skipped > 0) {
    logger.warn('Product options contract mapping completed with skipped entries', {
      received: items.length,
      returned: validProducts.length,
      skipped,
    })
  }

  return validProducts
}

export function toProductListContract(dto: ProductListPageApiDTO): Product[] {
  return toProductArrayContract(dto.items)
}
