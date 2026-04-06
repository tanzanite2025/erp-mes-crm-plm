'use client'

import { apiFetch } from '@/lib/api-client'
import { type MoldLoan, type Mold } from '../data/schema'

/**
 * MoldLoanService - 专门负责模具跨厂流转/借用业务 (已同步至后端)
 */
export class MoldLoanService {
    /**
     * 获取所有借用记录
     */
    static async getLoans(): Promise<MoldLoan[]> {
        const stored = await apiFetch<MoldLoan[]>('/mold-loans')
        if (!stored) throw new Error('[CRITICAL] 未能从后端获取模具借还记录')
        
        // 【智能预警】动态判定逾期状态 (前端实时计算以保证 UI 即时性)
        const now = new Date()
        return stored.map(loan => {
            if (loan.status === 'ACTIVE' && loan.expectedReturnDate) {
                const expectedDate = new Date(loan.expectedReturnDate)
                if (expectedDate < now) {
                    return { ...loan, status: 'OVERDUE' }
                }
            }
            return loan
        })
    }

    /**
     * 发起借用记录
     * 【原子化加固】调用后端聚合接口完成借单创建与模具状态更新
     */
    static async createLoan(loanData: Omit<MoldLoan, 'id' | 'createdAt'>) {
        // 直接调用聚合接口，后端会通过事务保证原子性
        const newLoan = await apiFetch<MoldLoan>('/mold-loans', {
            method: 'POST',
            body: JSON.stringify({ 
                loan: loanData, 
                moldStatus: 'LENT_OUT' 
            })
        })
        
        window.dispatchEvent(new CustomEvent('xdfc_mold_loans_updated'))
        window.dispatchEvent(new CustomEvent('xdfc_molds_updated'))
        return newLoan
    }

    /**
     * 发起借入记录 (外部模具入库)
     * 会在资产档案中创建一个临时模具记录
     */
    static async createBorrowRecord(loan: Omit<MoldLoan, 'id' | 'createdAt'>, moldData: Omit<Mold, 'id' | 'createdAt' | 'status'>) {
        // 建议由后端聚合接口处理
        const result = await apiFetch<any>('/mold-loans/borrow', {
            method: 'POST',
            body: JSON.stringify({ loan, moldData })
        })

        window.dispatchEvent(new CustomEvent('xdfc_mold_loans_updated'))
        window.dispatchEvent(new CustomEvent('xdfc_molds_updated'))
        return result
    }

    /**
     * 确认归还模具 (借出归还 或 借入归还)
     */
    static async returnMold(loanId: string) {
        // 1. 调用后端归还接口 (后端应自动处理模具状态流转)
        await apiFetch(`/mold-loans/${loanId}/return`, {
            method: 'POST'
        })
        
        window.dispatchEvent(new CustomEvent('xdfc_mold_loans_updated'))
        window.dispatchEvent(new CustomEvent('xdfc_molds_updated'))
    }

    /**
     * 删除借用记录 (仅用于系统清理)
     */
    static async deleteLoan(loanId: string) {
        await apiFetch(`/mold-loans/${loanId}`, {
            method: 'DELETE'
        })
        window.dispatchEvent(new CustomEvent('xdfc_mold_loans_updated'))
    }
}
