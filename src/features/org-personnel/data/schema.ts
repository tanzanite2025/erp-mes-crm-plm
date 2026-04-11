import { z } from 'zod'

export const employeeSchema = z.object({
    id: z.string(),
    staffId: z.string().optional(),
    name: z.string(),
    phone: z.string(),
    gender: z.string().optional(),
    birthday: z.string().optional(),
    idCard: z.string().optional(),
    emergencyPhone: z.string().optional(),
    address: z.string().optional(),
    bankCard: z.string().optional(),
    bankName: z.string().optional(),
    education: z.string().optional(),
    age: z.number().optional(),
    status: z.enum(['active', 'resigned', 'on-leave']),
    joinedDate: z.string().optional(),
    deptId: z.string().optional(),
    lineId: z.string().optional(),
    processId: z.string().optional(),
    positionId: z.string().optional(),
    deptName: z.string().optional(),
    lineName: z.string().optional(),
    processName: z.string().optional(),
    positionName: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
    version: z.number().default(1),
})

export const employeeStatusSchema = z.enum(['active', 'resigned', 'on-leave'])
export type EmployeeStatus = z.infer<typeof employeeStatusSchema>

export type Employee = z.infer<typeof employeeSchema>

export const jobTypeSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'orgPersonnel.validation.jobNameRequired'),
    code: z.string().min(1, 'orgPersonnel.validation.jobCodeRequired'),
    description: z.string().optional(),
    version: z.number().default(1),
})

export type JobType = z.infer<typeof jobTypeSchema>

export const teamTypeSchema = z.enum(['dispatch', 'quality', 'transfer', 'receive'])
export type TeamType = z.infer<typeof teamTypeSchema>

export const teamSchema = z.object({
    id: z.string(),
    code: z.string().min(1, 'orgPersonnel.validation.teamCodeRequired'),
    name: z.string().min(1, 'orgPersonnel.validation.teamNameRequired'),
    shortName: z.string().optional(),
    step: z.number().default(0),
    section: z.string(),
    type: teamTypeSchema,
    isMaintenance: z.boolean().default(false),
    status: z.enum(['active', 'inactive']).default('active'),
    remarks: z.string().optional(),
    operator: z.string().optional(),
    operateTime: z.string().optional(),
    version: z.number().default(1),
})

export type Team = z.infer<typeof teamSchema>
