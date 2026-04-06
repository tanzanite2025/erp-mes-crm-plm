import { type Product } from '../data/schema'
import { productService } from '../services/product-service'

/**
 * 格式化产品展示名称的全局工具函数
 * 已统一委托给 productService.formatDisplay 实现全系统标准化显示
 * 
 * @param product 产品对象
 * @param _dictEntries (已废弃，逻辑由服务层统一处理)
 * @returns 语义化后的中文字符串
 */
export function formatProductDisplayName(product: Product, _dictEntries: any[] = []) {
    return productService.formatDisplay(product)
}

/**
 * 结构化获取产品各维度属性标签 (用于分行显示或 Badge 展示)
 */
export function getProductAttributes(product: Product, _dictEntries: any[] = []) {
    // 保持对旧逻辑的兼容，但返回标准化的属性
    return {
        name: product.name,
        version: product.versionLevel || '标准版',
        series: product.techSeries || '常规系列',
        brake: product.brakeType || '未知刹车',
        weight: product.weight ? `${product.weight}g` : '未录入'
    }
}

