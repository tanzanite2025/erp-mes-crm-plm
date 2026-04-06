import { type SalesOrder } from '@/features/trading/data/schema'
import { type BOM } from '@/features/engineering/data/schema'
import { type Material, type PackagingRule } from '@/features/material-archive/data/schema'
import { type Product } from '@/features/engineering/data/schema'

export interface MaterialRequirement {
    materialId: string
    materialCode: string
    materialName: string
    materialSpec: string
    section: string
    totalRequired: number
    inventoryQty: number
    shortageGap: number
    unit: string
    sourceOrders: {
        orderNo: string
        customerName: string
        qty: number
        productName: string
        lineNo: number
        totalLines: number
    }[]
    hasBOM: boolean
    packaging?: {
        packUnit: string
        factor: number
        packQty: number
        direction?: 'forward' | 'reverse'
    }
}

export interface MrpCalculationInput {
    orders: SalesOrder[]
    boms: BOM[]
    materials: Material[]
    products: Product[]
    rules: PackagingRule[]
    inventory: any[] // 也可以精细化为 InventoryView[]
}

export interface MrpStats {
    totalMaterials: number
    missingBOMCount: number
    activeOrderCount: number
    analyzedModels: { modelName: string; totalQty: number }[]
}

export interface MrpResult {
    requirements: MaterialRequirement[]
    stats: MrpStats
}
