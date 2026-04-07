/**
 * XDFC SDRTS (Systematic Delta Reactive Tracking System)
 * 类型定义
 */

/**
 * 单个字段的差异项记录
 */
export interface DeltaItem {
  o: any; // Old value (原始值)
  n: any; // New value (新值)
}

/**
 * 扁平化路径的增量字典
 * Key 为点号分隔的路径，如 "config.maintenance.limit"
 */
export type DeltaSet = Record<string, DeltaItem>;

/**
 * SDRTS 提交载荷标准
 */
export interface DeltaPayload {
  op: 'PATCH';
  delta: DeltaSet;
  metadata: {
    id: string;
    version?: number;
    updatedAt?: string;
    [key: string]: any;
  };
}

/**
 * 追踪器配置选项
 */
export interface TrackerOptions {
  /** 是否深度追踪嵌套对象 (默认为 true) */
  deep?: boolean;
  /** 是否忽略原型链属性 (默认为 true) */
  ignorePrototype?: boolean;
  /** 排除追踪的特定键名 */
  excludeKeys?: string[];
}
