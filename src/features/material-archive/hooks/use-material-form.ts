import { useEffect, useMemo } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { materialSchema, type Material } from '../data/schema'

const categoryShortNames: Record<string, string> = {
  RAW_MATERIAL: 'RAW',
  原材料: 'RAW',
  PACKAGING: 'PKG',
  包装: 'PKG',
  AUXILIARY: 'AUX',
  辅助: 'AUX',
  CONSUMABLE: 'CON',
  易耗: 'CON',
  耗材: 'CON',
  CHEMICAL: 'CHE',
  化学: 'CHE',
  化工: 'CHE',
  化学制剂: 'CHE',
}

// 常见物料词库映射（智能推导编码）
const commonMaterialTerms: Record<string, string> = {
  纸箱: 'BOX',
  胶带: 'TAPE',
  切: 'CUTTER',
  铣刀: 'CUTTER',
  钻头: 'DRILL',
  刀片: 'BLADE',
  磨头: 'GRIND',
  胶水: 'GLUE',
  膜: 'FILM',
  布: 'CLOTH',
  板: 'BOARD',
  管: 'PIPE',
  件: 'PARTS',
  托盘: 'PALLET',
  箱: 'CASE',
  袋: 'BAG',
  瓶: 'BTL',
  盒: 'BOX',
  砂纸: 'SP',
  离型剂: 'RA',
  脱模剂: 'RA',
  洗模水: 'MC',
  清洗剂: 'MC',
  药剂: 'CHEM',
  手套: 'GLOVE',
  桶: 'DRM',
  支: 'UNT',
  刀: 'UNT',
  工装: 'TOOL',
  磨刀: 'GRIND',
}

const DEFAULT_VALUES: Material = {
  id: '',
  code: '',
  name: '',
  category: 'RAW_MATERIAL',
  spec: '',
  internalDimensions: {
    length: 0,
    width: 0,
    height: 0,
    unit: 'mm',
  },
  externalDimensions: {
    length: 0,
    width: 0,
    height: 0,
    unit: 'mm',
  },
  uom: 'PCS',
  minStock: 0,
  status: 'Active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  images: [],
  version: 1,
}

interface UseMaterialFormProps {
  material: Material | null
  open: boolean
  defaultCategory?: string
}

export function useMaterialForm({
  material,
  open,
  defaultCategory,
}: UseMaterialFormProps) {
  // SDRTS: Delta 追踪器
  const initialValues = useMemo(() => {
    if (material) return material
    return {
      ...DEFAULT_VALUES,
      category: defaultCategory || DEFAULT_VALUES.category,
    }
  }, [material, defaultCategory])

  const {
    data: deltaProxy,
    tracker,
    replace,
  } = useDeltaTracker(initialValues, open)

  const form = useForm<Material>({
    resolver: zodResolver(materialSchema) as Resolver<Material>,
    defaultValues: initialValues,
  })

  const selectedCategory = form.watch('category')
  const materialName = form.watch('name')

  // 智能推导编码逻辑
  useEffect(() => {
    if (!material && materialName) {
      // 模糊匹配前缀
      let prefix = 'MAT'
      for (const [key, val] of Object.entries(categoryShortNames)) {
        if (
          selectedCategory &&
          (selectedCategory.includes(key) ||
            (typeof key === 'string' && key.includes(selectedCategory)))
        ) {
          prefix = val
          break
        }
      }

      // 尝试从词库匹配英文简称
      let term = 'ITEM'
      for (const [cn, en] of Object.entries(commonMaterialTerms)) {
        if (materialName.includes(cn)) {
          term = en
          break
        }
      }

      // 如果名称本身含有英文/数字，则提取
      const alphanumericMatch = materialName.match(/[a-zA-Z0-9]+/g)
      const suffix = alphanumericMatch
        ? alphanumericMatch.join('-').toUpperCase()
        : term

      // 生成带序列或时间戳的唯一编码
      const finalCode = `${prefix}-${suffix}-${new Date().getTime().toString().slice(-4)}`
      form.setValue('code', finalCode, { shouldValidate: true })
    }
  }, [selectedCategory, materialName, material, form])

  // 弹窗打开/关闭时重置表单
  useEffect(() => {
    if (open) {
      form.reset(initialValues)
    }
  }, [open, initialValues, form])

  return {
    form,
    selectedCategory,
    materialName,
    tracker,
    replace,
    deltaProxy,
  }
}
