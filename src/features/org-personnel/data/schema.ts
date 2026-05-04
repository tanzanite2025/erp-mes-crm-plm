import { z } from 'zod'
import {
    entityIdentitySchema,
    entityOptionalActorAuditSchema,
    entityOptionalTimestampAuditSchema,
    entityVersionSchema,
} from '@/lib/schema/base-entity-schema'

export const employeeSchema = entityIdentitySchema
    .merge(entityOptionalTimestampAuditSchema)
    .merge(entityOptionalActorAuditSchema)
    .merge(entityVersionSchema)
    .extend({
    staffId: z.string().optional(),
    name: z.string(),
    phone: z.string(),
    gender: z.string().optional(),
    birthday: z.string().optional(),
    idCard: z.string().optional(),
    maskedIdCard: z.string().optional(),
    emergencyPhone: z.string().optional(),
    address: z.string().optional(),
    bankCard: z.string().optional(),
    maskedBankCard: z.string().optional(),
    bankName: z.string().optional(),
    education: z.string().optional(),
    age: z.number().optional(),
    status: z.enum(['active', 'resigned', 'on-leave']),
    joinedDate: z.string().optional(),
    workYears: z.string().optional(),
    deptId: z.string().optional(),
    lineId: z.string().optional(),
    processId: z.string().optional(),
    positionId: z.string().optional(),
    deptName: z.string().optional(),
    lineName: z.string().optional(),
    processName: z.string().optional(),
    positionName: z.string().optional(),
})

export const employeeStatusSchema = z.enum(['active', 'resigned', 'on-leave'])
export type EmployeeStatus = z.infer<typeof employeeStatusSchema>

export type Employee = z.infer<typeof employeeSchema>

export const jobTypeSchema = entityIdentitySchema
    .merge(entityVersionSchema)
    .extend({
    name: z.string().min(1, 'orgPersonnel.validation.jobNameRequired'),
    code: z.string().min(1, 'orgPersonnel.validation.jobCodeRequired'),
    description: z.string().optional(),
})

export type JobType = z.infer<typeof jobTypeSchema>

export const teamTypeSchema = z.enum(['dispatch', 'quality', 'transfer', 'receive'])
export type TeamType = z.infer<typeof teamTypeSchema>

export const teamSchema = entityIdentitySchema
    .merge(entityVersionSchema)
    .extend({
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
})

export type Team = z.infer<typeof teamSchema>
