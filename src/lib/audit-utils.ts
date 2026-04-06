import { useAuthStore } from '@/stores/auth-store'

export interface OperatorInfo {
  accountNo: string
  name: string
  label: string
}

/**
 * 审计工具类：从当前会话提取操作员信息
 */
export const auditUtils = {
  /**
   * 获取当前操作员的元数据（姓名与工号）
   * 优先从 authStore 提取，若未登录则返回“系统/未知”
   */
  getOperatorInfo(): OperatorInfo {
    const { user } = useAuthStore.getState()
    
    if (!user) {
      return {
        accountNo: 'SYSTEM',
        name: '系统自动',
        label: '系统自动 (SYSTEM)',
      }
    }

    // 2. 甄别真实姓名
    const name = user.username || user.accountNo
    // 仅当账号不是 UUID 且与姓名不同时才加上括号，否则只显示姓名
    const accountIsUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.accountNo)
    const label = (name === user.accountNo || accountIsUUID) ? name : `${name} (${user.accountNo})`
    
    return {
      accountNo: user.accountNo,
      name: name,
      label: label,
    }
  },

  /**
   * 清洗函数：剥离字符串中可能存在的 "(UUID)" 冗余后缀
   * 用于修复显示已经存入数据库的旧数据
   */
  formatOperatorName(rawName?: string): string {
    if (!rawName || rawName === 'SYSTEM' || rawName === '系统自动 (SYSTEM)') return 'SYSTEM_AUTO'
    
    // 匹配 "名字 (UUID)" 格式并剥离括号部分
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
      
      // 如果是 "A (B)" 格式，且 B 是 UUID，则只保留 A
      if (rawName.includes('(') && rawName.includes(')')) {
          const parts = rawName.split(/\(|\)/)
          const name = parts[0]?.trim()
          const secondary = parts[1]?.trim()
          if (secondary && uuidRegex.test(secondary)) {
              return name || secondary
          }
      }

      // 如果整个字符串就是 UUID，并且太长，截取前 8 位或保留原样（如果后续改为了管理员则不在此列）
      if (rawName.length === 36 && uuidRegex.test(rawName)) {
          return rawName.slice(0, 8) + '...'
      }

      return rawName
  },

  /**
   * 为对象注入审计戳 (Stamping)
   * @param data 原始数据
   * @param type 操作类型：'create' | 'update' | 'approve'
   */
  stamp<T extends object>(data: T, type: 'create' | 'update' | 'approve' = 'create'): T & {
    createdBy?: string
    createdAt?: string
    updatedBy?: string
    updatedAt?: string
    approvedBy?: string
    approvedAt?: string
  } {
    const operator = this.getOperatorInfo()
    const now = new Date().toISOString()

    const result = { ...data } as any

    if (type === 'create') {
      result.createdBy = operator.label
      result.createdAt = now
    } else if (type === 'update') {
      result.updatedBy = operator.label
      result.updatedAt = now
    } else if (type === 'approve') {
      result.approvedBy = operator.label
      result.approvedAt = now
    }

    return result
  }
}
