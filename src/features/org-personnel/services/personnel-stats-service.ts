import { EmployeeCoreService } from './employee-core-service'
import { LeaveService } from './leave-service'

export interface EmployeeStats {
  employeeId: string
  name: string
  deptName?: string
  attendanceRate: number // 出勤率 0-1
  leaveDays: number
  tenureYears: number
  score: number // 综合评分
}

/**
 * PersonnelStatsService - 专门用于人员统计与优秀员工筛选逻辑。
 * 完全隔离开发，不修改核心业务 Service。
 */
export const PersonnelStatsService = {
  /**
   * 获取全员深度统计分析（含优秀员工排名）
   */
  getExcellentEmployeeRanking: async (): Promise<EmployeeStats[]> => {
    // 1. 获取基础数据
    const [employees, leaves] = await Promise.all([
      EmployeeCoreService.getEmployees(),
      // 模拟获取全量请假记录（实际应有后端接口支持全量统计）
      // 此处为了隔离开发，即便 LeaveService 报错也不应崩溃
      LeaveService.getMyLeaveRequests().catch(() => []) 
    ])

    // 2. 计算统计指标
    const stats: EmployeeStats[] = employees.map(emp => {
      // 计算工龄
      const joinedDate = emp.joinedDate ? new Date(emp.joinedDate) : new Date()
      const tenureYears = Math.floor((new Date().getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24 * 365))
      
      // 计算请假天数（此处仅为演示逻辑，过滤该员工的已批准请假）
      const empLeaves = leaves.filter(l => l.employeeId === emp.id && l.status === 'APPROVED')
      const leaveDays = empLeaves.reduce((acc, curr) => acc + (curr.durationDays || 0), 0)

      // 计算出勤率（简单假设周期为 30 天）
      const totalWorkDays = 22
      const attendanceRate = Math.max(0, (totalWorkDays - leaveDays) / totalWorkDays)

      // 优秀员工评分模型：Score = (出勤率 * 50) + (工龄权重 * 20) + (基础分 30)
      const score = (attendanceRate * 50) + (Math.min(tenureYears, 10) * 2) + 30

      return {
        employeeId: emp.id,
        name: emp.name,
        deptName: emp.deptName,
        attendanceRate,
        leaveDays,
        tenureYears,
        score: Math.round(score * 10) / 10
      }
    })

    // 3. 排序：按评分降序
    return stats.sort((a, b) => b.score - a.score)
  },

  /**
   * 获取部门维度的统计概况
   */
  getDeptOverview: async () => {
    const employees = await EmployeeCoreService.getEmployees()
    const depts: Record<string, number> = {}
    
    employees.forEach(emp => {
      const name = emp.deptName || '未分配'
      depts[name] = (depts[name] || 0) + 1
    })

    return Object.entries(depts).map(([name, count]) => ({ name, count }))
  }
}
