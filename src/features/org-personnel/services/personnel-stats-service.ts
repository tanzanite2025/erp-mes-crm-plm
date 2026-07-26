import { apiFetch } from '@/lib/api-client'

export interface EmployeeStats {
  employeeId: string
  name: string
  orgUnitName?: string
  attendanceRate: number
  leaveDays: number
  tenureYears: number
  score: number
}

interface EmployeeDeptOverviewRow {
  deptName?: string | null
}

/**
 * PersonnelStatsService - 负责人员分析统计的前端服务。
 * 遵循“后端权威”原则：所有的核心评分（优秀员工算法）均在后端计算。
 * 前端仅作为展示层，不包含业务计算模型。
 */
export const PersonnelStatsService = {
  /**
   * 获取全员深度统计分析（含优秀员工排名）
   * 逻辑变迁：从前端手动 map/filter/score 重构成直接请求后端权威接口。
   */
  getExcellentEmployeeRanking: async (): Promise<EmployeeStats[]> => {
    // 调用后端权威统计接口
    const data = await apiFetch<EmployeeStats[]>('/stats/excellence')

    if (!data) {
      throw new Error(
        '[CRITICAL_PATH] Backend failed to return personnel analytics data'
      )
    }

    return data
  },

  /**
   * 获取部门维度的统计概况 (可根据需要也迁移至后端)
   */
  getDeptOverview: async () => {
    // 暂时保留简单 UI 统计，或后续统一由后端聚合
    const employees = await apiFetch<EmployeeDeptOverviewRow[]>('/employees')
    const depts: Record<string, number> = {}

    employees.forEach((emp) => {
      const name = emp.deptName || '未分配'
      depts[name] = (depts[name] || 0) + 1
    })

    return Object.entries(depts).map(([name, count]) => ({ name, count }))
  },
}
