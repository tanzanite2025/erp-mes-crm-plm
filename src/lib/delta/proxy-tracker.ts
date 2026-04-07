import { type DeltaSet } from './types';

/**
 * SDRTS ProxyTracker
 * 
 * 一个基于 Proxy 的变更追踪引擎。
 * 能够自动捕获深度嵌套对象的变更，并生成扁平化路径的 Delta 集合。
 */
export class ProxyTracker<T extends Record<string, any>> {
    private readonly original: T;
    private draft: T;
    private readonly mutations = new Map<string, any>();
    private proxyCache = new WeakMap<object, any>();
    private onMutation?: () => void;

    constructor(initialData: T, onMutation?: () => void) {
        // 深拷贝原始数据，确保对比基准不被改变
        this.original = JSON.parse(JSON.stringify(initialData));
        this.onMutation = onMutation;
        this.draft = this.createProxy(this.original, "");
    }

    /**
     * 获取追踪中的代理对象 (用户应直接操作此对象)
     */
    get data(): T {
        return this.draft;
    }

    /**
     * 核心递归代理生成器
     */
    private createProxy(target: any, path: string): any {
        if (target === null || typeof target !== 'object') {
            return target;
        }

        const cached = this.proxyCache.get(target);
        if (cached) return cached;

        const self = this;
        const proxy = new Proxy(target, {
            get(obj, key) {
                if (key === '__isProxy') return true;
                if (key === '__target') return obj;

                const val = Reflect.get(obj, key);
                const currentPath = path ? `${path}.${String(key)}` : String(key);
                
                // 递归代理
                return self.createProxy(val, currentPath);
            },
            set(obj, key, value) {
                const currentPath = path ? `${path}.${String(key)}` : String(key);
                const oldValue = Reflect.get(obj, key);

                // 如果值没变，不记录变更
                if (oldValue === value) return true;

                // 记录变更动作
                Reflect.set(obj, key, value);
                self.mutations.set(currentPath, value);
                
                // 通知监听器相关变更
                self.onMutation?.();
                
                return true;
            },
            deleteProperty(obj, key) {
                const currentPath = path ? `${path}.${String(key)}` : String(key);
                Reflect.deleteProperty(obj, key);
                self.mutations.set(currentPath, null); // 删除视作设为 null
                
                // 通知监听器相关变更
                self.onMutation?.();
                
                return true;
            }
        });

        this.proxyCache.set(target, proxy);
        return proxy;
    }

    /**
     * 提交变更并生成 Delta 载荷
     */
    public commit(): DeltaSet {
        const delta: DeltaSet = {};

        this.mutations.forEach((newValue, path) => {
            const oldValue = this.getValueByPath(this.original, path);
            
            // 最终脏检查：提交时再次确认新值与旧值是否真的不同
            if (!this.isEqual(oldValue, newValue)) {
                delta[path] = {
                    o: oldValue,
                    n: newValue
                };
            }
        });

        return delta;
    }

    /**
     * 检查是否发生了任何实质性的变更
     */
    public isDirty(): boolean {
        return Object.keys(this.commit()).length > 0;
    }

    /**
     * 根据扁平路径获取对象中的值
     */
    private getValueByPath(obj: any, path: string): any {
        return path.split('.').reduce((acc, part) => {
            return acc && acc[part] !== undefined ? acc[part] : undefined;
        }, obj);
    }

    /**
     * 简单的深度相等对比 (针对基本类型和常规 JSON 对象)
     */
    private isEqual(a: any, b: any): boolean {
        if (a === b) return true;
        if (a === null || b === null) return a === b;
        if (typeof a !== typeof b) return false;
        
        if (typeof a === 'object') {
            return JSON.stringify(a) === JSON.stringify(b);
        }
        
        return false;
    }
}

/**
 * 便利函数：初始化一个追踪任务
 */
export function trackDelta<T extends Record<string, any>>(data: T, onMutation?: () => void) {
    return new ProxyTracker<T>(data, onMutation);
}
