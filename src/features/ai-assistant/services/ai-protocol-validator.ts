/**
 * AI 协议验证器 (AI Protocol Validator)
 * 职责：防止 AI 幻觉生成的非法路由或高危指令。
 */

import { createLogger } from '@/lib/logger'

const logger = createLogger('AiProtocolValidator')

/** 合法业务路由白名单 */
const ALLOWED_ROUTES = [
  '/',
  '/dashboard',
  '/mrp',
  '/mrp/requirements',
  '/trading/sales-orders',
  '/trading/customers',
  '/engineering/products',
  '/engineering-db/parts',
  '/warehouse/stock',
  '/warehouse/receipts',
  '/warehouse/shipments',
  '/tooling-furnaces',
  '/finance/accounts',
  '/system-mgmt/users',
  '/system-mgmt/configs'
];

/**
 * 验证跳转路由是否合法
 */
export function isValidRoute(route: string): boolean {
  if (!route) return false;
  
  // 移除查询参数进行基础路径匹配
  const basePath = route.split('?')[0];
  
  // 1. 精确匹配白名单
  if (ALLOWED_ROUTES.includes(basePath)) return true;
  
  // 2. 动态路由匹配 (例: /trading/sales-orders/SO-001)
  const isDynamicOrder = /^\/trading\/sales-orders\/[^/]+$/.test(basePath);
  const isDynamicProduct = /^\/engineering\/products\/[^/]+$/.test(basePath);
  
  if (isDynamicOrder || isDynamicProduct) return true;

  return false;
}

/**
 * 修正/过滤 Action 列表
 */
export interface ActionItem {
  label: string;
  value: string;
  type: 'ACT' | 'CMD';
}

export function validateActions(actions: ActionItem[]): ActionItem[] {
  return actions.filter(action => {
    if (action.type === 'CMD') return true; // CMD 逻辑在执行端有独立校验
    
    const isValid = isValidRoute(action.value);
    if (!isValid) {
      logger.warn(`Blocked suspicious/invalid route hallucination: ${action.value}`);
    }
    return isValid;
  });
}
