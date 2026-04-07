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

export interface MrpStats {
  totalMaterials: number
  missingBOMCount: number
  activeOrderCount: number
  analyzedModels: { modelName: string; totalQty: number }[]
}
