import { type Employee, type EmployeeStatus } from '../data/schema'

/**
 * @deprecated
 * [ARCHITECTURE HARDENING] 
 * 本文件已废弃。员工档案逻辑已物理拆分为领域服务：
 * - 查询处理: EmployeeCoreService
 * - 维护与 SDRTS: EmployeeMaintenanceService
 * - 事务/同步: EmployeeTransactionService
 * 
 * 原始逻辑已物理备份至 ./employee-service.ts.txt
 * 注意：新服务已移除副作用 (window.dispatchEvent)，请确保 UI 层使用 React Query 的生命周期管理更新。
 */

const DEPRECATED_ERROR = "[CRITICAL] 调用了已废弃的 EmployeeService。请迁移至 EmployeeCoreService 或相关领域服务。";

export const EmployeeService = new Proxy({} as any, {
    get() {
        console.error(DEPRECATED_ERROR);
        throw new Error(DEPRECATED_ERROR);
    }
});

// 仅保留导出函数名以防 IDE 索引未及时更新导致的类型报错，但运行时均会触发 Proxy 错误
export const getEmployees = (EmployeeService as any).getEmployees;
export const saveEmployee = (EmployeeService as any).saveEmployee;
export const updateEmployeesStatus = (EmployeeService as any).updateEmployeesStatus;
export const deleteEmployees = (EmployeeService as any).deleteEmployees;
export const syncEmployees = (EmployeeService as any).syncEmployees;
export const patchEmployee = (EmployeeService as any).patchEmployee;

export type { Employee, EmployeeStatus }
