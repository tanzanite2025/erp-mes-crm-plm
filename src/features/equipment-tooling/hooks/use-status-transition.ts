/**
 * 维保记录状态流转 Hook
 *
 * 提供状态流转规则和标签映射
 */

export function useStatusTransition() {
  /**
   * 获取当前状态允许流转到的下一个状态列表
   */
  const getValidNextStatuses = (currentStatus: string): string[] => {
    switch (currentStatus) {
      case 'OPEN':
        return ['OPEN', 'IN_PROGRESS', 'CANCELLED']
      case 'IN_PROGRESS':
        return ['IN_PROGRESS', 'COMPLETED', 'CANCELLED']
      case 'COMPLETED':
        return ['COMPLETED'] // 终态
      case 'CANCELLED':
        return ['CANCELLED'] // 终态
      default:
        return [currentStatus]
    }
  }

  /**
   * 获取状态的中文标签
   */
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'OPEN':
        return '待处理'
      case 'IN_PROGRESS':
        return '进行中'
      case 'COMPLETED':
        return '已完成'
      case 'CANCELLED':
        return '已取消'
      default:
        return status
    }
  }

  /**
   * 检查状态流转是否有效
   */
  const isValidTransition = (
    currentStatus: string,
    newStatus: string
  ): boolean => {
    return getValidNextStatuses(currentStatus).includes(newStatus)
  }

  return {
    getValidNextStatuses,
    getStatusLabel,
    isValidTransition,
  }
}
