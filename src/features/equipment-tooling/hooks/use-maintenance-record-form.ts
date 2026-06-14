import { useState } from 'react'

/**
 * 维保记录表单状态管理 Hook
 *
 * 封装表单数据、验证和重置逻辑
 */

export interface MaintenanceRecordFormData {
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION'
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  cost: number
  remarks: string
}

const initialFormData: MaintenanceRecordFormData = {
  type: 'PREVENTIVE',
  title: '',
  description: '',
  priority: 'MEDIUM',
  cost: 0,
  remarks: '',
}

export function useMaintenanceRecordForm() {
  const [formData, setFormData] =
    useState<MaintenanceRecordFormData>(initialFormData)

  /**
   * 更新表单字段
   */
  const updateField = <K extends keyof MaintenanceRecordFormData>(
    field: K,
    value: MaintenanceRecordFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  /**
   * 验证表单
   */
  const validate = (): { valid: boolean; error?: string } => {
    if (!formData.title.trim()) {
      return { valid: false, error: '标题不能为空' }
    }

    if (formData.title.length > 255) {
      return { valid: false, error: '标题长度不能超过 255 个字符' }
    }

    if (formData.description.length > 5000) {
      return { valid: false, error: '描述长度不能超过 5000 个字符' }
    }

    if (formData.remarks.length > 5000) {
      return { valid: false, error: '备注长度不能超过 5000 个字符' }
    }

    if (formData.cost < 0) {
      return { valid: false, error: '成本不能为负数' }
    }

    if (formData.cost > 999999999.99) {
      return { valid: false, error: '成本不能超过 999,999,999.99' }
    }

    return { valid: true }
  }

  /**
   * 重置表单
   */
  const reset = () => {
    setFormData(initialFormData)
  }

  /**
   * 获取提交数据
   */
  const getSubmitData = () => ({
    type: formData.type,
    title: formData.title.trim(),
    description: formData.description.trim(),
    priority: formData.priority,
    cost: formData.cost,
    remarks: formData.remarks.trim(),
  })

  return {
    formData,
    setFormData,
    updateField,
    validate,
    reset,
    getSubmitData,
  }
}
