import { useMemo, useState, useCallback } from 'react';
import { ProxyTracker } from '@/lib/delta/proxy-tracker';

/**
 * useDeltaTracker - SDRTS 核心 Hook
 * 
 * 为 React 组件提供基于 Proxy 的数据追踪能力。
 * 自动捕获变更，并提供脏检查与 Delta 提交功能。
 * 
 * @param initialData 初始领域模型数据
 */
export function useDeltaTracker<T extends Record<string, any>>(initialData: T) {
  // 用于强制触发组件重绘的状态
  const [, setTick] = useState(0);
  
  // 初始化追踪器实例
  const tracker = useMemo(() => {
    return new ProxyTracker<T>(initialData, () => {
      setTick(t => t + 1);
    });
  }, [initialData]);

  /**
   * 获取追踪中的代理对象
   */
  const data = tracker.data;

  /**
   * 提交变更并获取 Delta 载荷
   */
  const commit = useCallback(() => {
    return tracker.commit();
  }, [tracker]);

  /**
   * 检查当前是否发生了变更
   */
  const isDirty = useCallback(() => {
    return tracker.isDirty();
  }, [tracker]);

  /**
   * 获取变更集数量 (用于 UI 显示)
   */
  const mutationCount = tracker ? Object.keys(tracker.commit()).length : 0;

  return {
    data,
    commit,
    isDirty,
    mutationCount,
    tracker // 暴露原始实例以备不时之需
  };
}
