import { useAuthStore } from '@/stores/auth-store';
import { createLogger } from '@/lib/logger';

/**
 * 全局统一 API 客户端
 * 集成了：15s 超时控制、性能打点 (X-Response-Time)、全局熔断器 (Circuit Breaker)、标准的错误拦截。
 */

// 全局熔断器状态
const circuitBreaker = {
    failures: 0,
    tripped: false,
    tripTime: 0,
    resetTimeout: 5000, // 缩短冷却时间到 5s，实现更灵敏的自愈
    threshold: import.meta.env.DEV ? 50 : 10 // 提高开发环境阈值，防止跨境抖动误伤
};

interface ExtendedRequestInit extends RequestInit {
    ignoreBreaker?: boolean;
    suppressErrorStatuses?: number[];
}

interface ApiFetchError extends Error {
    status?: number;
    code?: unknown;
    isConflict?: boolean;
}

const logger = createLogger('apiFetch');

function shouldSuppressErrorLog(status: number | undefined, options: ExtendedRequestInit): boolean {
    if (!Number.isFinite(status)) return false;
    return Array.isArray(options.suppressErrorStatuses) && options.suppressErrorStatuses.includes(status as number);
}

let unauthorizedRedirectInFlight = false;

function isPublicEndpoint(endpoint: string): boolean {
    return endpoint === '/auth/login' || endpoint === '/health';
}

function buildSignInRedirectHref(): string {
    if (typeof window === 'undefined') return '/sign-in';
    const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    return `/sign-in?redirect=${encodeURIComponent(redirect)}`;
}

function handleUnauthorizedSession(endpoint: string) {
    if (typeof window === 'undefined') return;
    if (isPublicEndpoint(endpoint)) return;
    if (unauthorizedRedirectInFlight) return;

    unauthorizedRedirectInFlight = true;
    useAuthStore.getState().reset();

    if (window.location.pathname.includes('/sign-in') || window.location.pathname.includes('/forgot-password')) {
        return;
    }

    window.location.replace(buildSignInRedirectHref());
}

export async function apiFetch<T>(endpoint: string, options: ExtendedRequestInit = {}): Promise<T> {
    // 检查熔断器状态
    if (circuitBreaker.tripped && !options.ignoreBreaker) {
        if (Date.now() - circuitBreaker.tripTime > circuitBreaker.resetTimeout) {
            // 冷却期结束，进入半开状态，允许尝试
            circuitBreaker.tripped = false;
        } else {
            throw new Error(`[CIRCUIT_BREAKER] 持续网络超时，已触发短路保护。拦截请求: ${endpoint}`);
        }
    }

    const start = performance.now();
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const token = useAuthStore.getState().accessToken;
    
    // 【Auth Session Gate】未认证请求保护：除了登录和健康检查，其余请求在无 Token 时直接原地阻断
    // 这能有效防止登录页背景请求堆积导致真实的登录请求超时 (Connection Pool Starvation)
    const publicEndpoint = isPublicEndpoint(endpoint);
    if (!token && !publicEndpoint && !options.ignoreBreaker) {
        throw new Error(`[AUTH_REQUIRED] 未认证的 API 请求被拦截: ${endpoint}`);
    }
    
    const controller = new AbortController();
    
    // 动态超时策略：考虑到跨境访问延迟，放宽生产环境默认超时
    let dynamicTimeout = 30000; 
    
    // 识别初始化/发现阶段的请求 (这些请求耗时不稳定，但不应轻易触发熔断)
    const isDiscoveryRequest =
        endpoint.includes('/engineering/products') ||
        endpoint.includes('/logistics') ||
        endpoint.includes('/health');

    const isSyncPhase = endpoint.includes('/sync') || endpoint.includes('/bulk-sync');

    if (import.meta.env.DEV) {
        if (isDiscoveryRequest) {
            dynamicTimeout = 30000; // Vultr 远程连接较慢，调优到 30s
        } else if (isSyncPhase) {
            dynamicTimeout = 45000; // 批量同步是大包数据，放宽到 45s
        } else {
            // 普通列表/详情请求不再等待 45s，10s 不回包直接判定为网络拥塞
            dynamicTimeout = 10000; 
        }
    }

    const timeoutId = setTimeout(() => controller.abort(), dynamicTimeout); 
    
    try {
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${token}`,
            ...options.headers as Record<string, string>,
        };

        // 如果 body 不是 FormData，则默认设为 application/json
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(`${baseUrl}/api/v1${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const fetchEnd = performance.now();
        const serverTime = response.headers.get('X-Response-Time') || 'unknown';
        
        // 仅在开发模式或特定耗时请求时打印性能日志
        if (import.meta.env.DEV || (fetchEnd - start) > 1000) {
            const serverInfo = serverTime === 'unknown' ? 'N/A' : serverTime;
            logger.debug(`Performance sample for ${endpoint}`, {
                totalMs: Number((fetchEnd - start).toFixed(2)),
                serverTime: serverInfo,
            });
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // 【熔断降级策略修正】
            // 仅对非 4xx 的请求（如 5xx 或超时）计入熔断，防止由于权限不足 (403) 导致全盘由于网络原因被锁定。
            // 只要后端能给回 4xx，说明网络链路是通的，此时应重置失败计数，防止进入假死的“死亡熔断”。
            if (response.status >= 400 && response.status < 500) {
                circuitBreaker.failures = 0;
                circuitBreaker.tripped = false;
            } else if (!isDiscoveryRequest && !options.ignoreBreaker) {
                circuitBreaker.failures++;
                if (circuitBreaker.failures >= circuitBreaker.threshold) {
                    circuitBreaker.tripped = true;
                    circuitBreaker.tripTime = Date.now();
                    logger.warn('Circuit breaker tripped after repeated backend response errors', {
                        endpoint,
                        failures: circuitBreaker.failures,
                    });
                }
            }
            
            // 工业级修复：抛出的 Error 对象必须携带 status 以供 UI 层进行状态分支处理 (如 409/403)
            const errorMessage = errorData.error || errorData.message || `[API_ERROR] ${response.status} ${response.statusText}`;
            const error = new Error(errorMessage) as ApiFetchError;
            error.status = response.status;
            error.code = errorData.code;
            error.isConflict = response.status === 409;
            if (response.status === 401) {
                handleUnauthorizedSession(endpoint);
            }
            throw error;
        }

        // 请求成功，重置熔断器 (只要有任意一个请求成功，说明网络链路已恢复)
        circuitBreaker.failures = 0;
        circuitBreaker.tripped = false;

        if (response.status === 204) return null as T;
        const data = await response.json();

        // 【根治方案：全局 API 响应解包与混合对象防御】
        // 条件：判定 data 是一个简单的 Data/Pagination 包装器对象。
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            // 候选包装路径：items (标准分页) 或 data (标准响应包装)
            const wrapperKey = ('items' in data) ? 'items' : (('data' in data) ? 'data' : null);
            
            const shouldCreateHybridArray =
                wrapperKey === 'items' &&
                Array.isArray((data as any)[wrapperKey]) &&
                typeof (data as Record<string, unknown>).total === 'number';

            if (shouldCreateHybridArray) {
                const wrappedData = data as Record<string, unknown>;
                const primaryArray = Array.isArray(wrappedData[wrapperKey]) ? wrappedData[wrapperKey] as unknown[] : [];
                
                // 混合数组逻辑：将数组实例包装为带有原始对象元数据的 Proxy。
                // 这种模式能确保：Array.isArray(hybrid) === true，且 hybrid.total / hybrid.version 依然可访问。
                const hybridArray = [...primaryArray] as unknown[] & Record<string, unknown>;
                
                // 合并所有非数组部分的元数据（如 total, version, status 等）
                Object.entries(wrappedData).forEach(([key, val]) => {
                    if (key !== wrapperKey) {
                        hybridArray[key] = val;
                    }
                });
                
                // 显式保留对原始包装键的引用
                hybridArray[wrapperKey] = primaryArray; 
                
                return hybridArray as T;
            }
        }

        return data;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
            if (!isDiscoveryRequest && !options.ignoreBreaker) {
                circuitBreaker.failures++;
                if (circuitBreaker.failures >= circuitBreaker.threshold) {
                    circuitBreaker.tripped = true;
                    circuitBreaker.tripTime = Date.now();
                    logger.warn('Circuit breaker tripped after repeated request timeouts', {
                        endpoint,
                        failures: circuitBreaker.failures,
                    });
                }
            }
            
            const seconds = parseFloat((dynamicTimeout / 1000).toFixed(1));
            const error = new Error(`[TIMEOUT] 请求 ${endpoint} 超过 ${seconds} 秒，网络可能不稳定`);
            throw error;
        }
        
        // 对于其他的网络异常 (Fetch Failed 等)
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
            // 【生产环境诊断】检查 BaseURL 是否与当前访问域名错位
            const currentHost = window.location.hostname;
            let apiHost = 'unknown';
            try {
                if (baseUrl) apiHost = new URL(baseUrl).hostname;
            } catch (_e) {
                apiHost = baseUrl || 'unknown';
            }
            
            if (apiHost === 'localhost' || apiHost === '127.0.0.1') {
                if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
                    logger.error('Detected frontend/backend deployment mismatch', {
                        currentHost,
                        apiHost,
                    });
                }
            }

            if (!options.ignoreBreaker) {
                circuitBreaker.failures++;
                if (circuitBreaker.failures >= circuitBreaker.threshold) {
                    circuitBreaker.tripped = true;
                    circuitBreaker.tripTime = Date.now();
                    logger.warn('Circuit breaker tripped after repeated fetch failures', {
                        endpoint,
                        failures: circuitBreaker.failures,
                        origin: window.location.origin,
                    });
                }
            }
        }
        const errorEnd = performance.now();
        const status = err && typeof err === 'object' && 'status' in err
            ? Number((err as { status?: unknown }).status)
            : undefined;
        if (!shouldSuppressErrorLog(status, options)) {
            logger.error(`Request failed for ${endpoint}`, {
                durationMs: Number((errorEnd - start).toFixed(2)),
                error: err,
                status,
            });
        }

        if (
            err instanceof Error &&
            ((err as ApiFetchError).status === 401 || /invalid or expired token/i.test(err.message))
        ) {
            handleUnauthorizedSession(endpoint);
        }

        
        throw err;
    }
}
