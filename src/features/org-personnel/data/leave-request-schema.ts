import { z } from 'zod'

export const leaveTypeSchema = z.enum([
  'annual',   // 年假
  'sick',     // 病假
  'personal', // 事假
  'marriage', // 婚假
  'maternity',// 产假
  'funeral',  // 丧假
  'other'     // 其他
])

export type LeaveType = z.infer<typeof leaveTypeSchema>

export const leaveRequestStatusSchema = z.enum([
  'PENDING',    // 待审批
  'APPROVED',   // 已批准
  'REJECTED',   // 已拒绝
  'CANCELED'    // 已撤销
])

export type LeaveRequestStatus = z.infer<typeof leaveRequestStatusSchema>

export const leaveRequestSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string().optional(),
  leaveType: leaveTypeSchema,
  startTime: z.string(), // ISO String
  endTime: z.string(),   // ISO String
  durationDays: z.number().min(0.5),
  reason: z.string().min(1, 'orgPersonnel.validation.leaveReasonRequired'),
  status: leaveRequestStatusSchema.default('PENDING'),
  approvalId: z.string().optional(),
  createdAt: z.string().optional(),
  version: z.number().default(1),
})

export type LeaveRequest = z.infer<typeof leaveRequestSchema>

export const leavePreviewSchema = z.object({
  employeeId: z.string(),
  employeeName: z.string().optional(),
  leaveType: leaveTypeSchema,
  startTime: z.string(),
  endTime: z.string(),
  durationDays: z.number().min(0.5),
})

export type LeavePreview = z.infer<typeof leavePreviewSchema>

export const leaveCreateFormSchema = z.object({
  leaveType: leaveTypeSchema,
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  reason: z.string().min(1, 'orgPersonnel.validation.leaveReasonRequired'),
})

export type LeaveCreateForm = z.infer<typeof leaveCreateFormSchema>
