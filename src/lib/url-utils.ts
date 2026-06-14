/**
 * XDFC 静态资源解析工具类 (URL Utilities)
 * 职责: 集中处理生产环境下的资源寻址，通过环境自适应逻辑防止预览链接失效。
 */

/**
 * 获取静态上传资源的完整访问 URL
 * @param path 后端返回的文件相对路径 (如 ev-uuid.webp)
 * @returns 完整的访问链接
 */
export function getStaticEvidenceUrl(path: string | undefined): string {
  if (!path) return ''

  // 逻辑旁路: 如果是实时生成的 Blob URL 或已是完整链接，则直接返回
  if (path.startsWith('blob:') || path.startsWith('http')) {
    return path
  }

  // 后端 WebP 归档的基础路径标识
  const uploadPrefix = '/uploads/'

  // 智能获取环境变量
  const baseUrl = import.meta.env.VITE_API_BASE_URL || ''

  // 规格化 Base URL (确保不带结尾斜杠，由后续拼接控制)
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  return `${normalizedBase}${uploadPrefix}${path}`
}

/**
 * 生产环境鲁棒性检查: 判断当前是否处于分布式存储模式
 */
export function isRemoteStorageEnabled(): boolean {
  return !!import.meta.env.VITE_API_BASE_URL
}
