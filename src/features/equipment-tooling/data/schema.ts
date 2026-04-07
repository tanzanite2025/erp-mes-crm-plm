import { z } from 'zod'
import type { TranslationKey } from '@/locales'

export const moldStatusSchema = z.enum(['IDLE', 'IN_USE', 'CHECKING', 'MAINTENANCE', 'RETIRED', 'LENT_OUT', 'BORROWED'])
export const furnaceStatusSchema = z.enum(['IDLE', 'HEATING', 'COOLING', 'MAINTENANCE', 'FAULT'])

type EquipmentToolingTranslate = (key: TranslationKey, params?: Record<string, string | number>) => string

type MoldValidationKey =
    | 'equipmentTooling.molds.dialog.validation.snRequired'
    | 'equipmentTooling.molds.dialog.validation.nameRequired'
    | 'equipmentTooling.molds.dialog.validation.maxCyclesPositive'
    | 'equipmentTooling.molds.dialog.validation.maintenanceThresholdPositive'

type FurnaceValidationKey =
    | 'equipmentTooling.furnaces.dialog.validation.snRequired'
    | 'equipmentTooling.furnaces.dialog.validation.nameRequired'
    | 'equipmentTooling.furnaces.dialog.validation.typeRequired'
    | 'equipmentTooling.furnaces.dialog.validation.maxTempPositive'

type PartnerValidationKey =
    | 'equipmentTooling.partners.validation.nameRequired'

type DrawingValidationKey =
    | 'equipmentTooling.drawings.validation.nameRequired'
    | 'equipmentTooling.drawings.validation.fileRequired'

const moldValidationFallbacks: Record<MoldValidationKey, string> = {
    'equipmentTooling.molds.dialog.validation.snRequired': '请输入模具编号',
    'equipmentTooling.molds.dialog.validation.nameRequired': '请输入模具名称',
    'equipmentTooling.molds.dialog.validation.maxCyclesPositive': '寿命上限必须大于 0',
    'equipmentTooling.molds.dialog.validation.maintenanceThresholdPositive': '预警阈值必须大于 0',
}

const furnaceValidationFallbacks: Record<FurnaceValidationKey, string> = {
    'equipmentTooling.furnaces.dialog.validation.snRequired': '请输入炉台编号',
    'equipmentTooling.furnaces.dialog.validation.nameRequired': '请输入炉台名称',
    'equipmentTooling.furnaces.dialog.validation.typeRequired': '请输入炉台类型',
    'equipmentTooling.furnaces.dialog.validation.maxTempPositive': '最高温度必须大于 0',
}

const partnerValidationFallbacks: Record<PartnerValidationKey, string> = {
    'equipmentTooling.partners.validation.nameRequired': '单位名称不能为空',
}

const drawingValidationFallbacks: Record<DrawingValidationKey, string> = {
    'equipmentTooling.drawings.validation.nameRequired': '请输入图纸名称',
    'equipmentTooling.drawings.validation.fileRequired': '请上传图纸文件',
}

function getEquipmentToolingValidationMessage<T extends MoldValidationKey | FurnaceValidationKey | PartnerValidationKey | DrawingValidationKey>(
    t: EquipmentToolingTranslate | undefined,
    key: T,
    fallbacks: Record<T, string>
) {
    return t?.(key) ?? fallbacks[key]
}

export function createMoldSchema(t?: EquipmentToolingTranslate) {
    return z.object({
        id: z.string(),
        sn: z.string().min(1, getEquipmentToolingValidationMessage(t, 'equipmentTooling.molds.dialog.validation.snRequired', moldValidationFallbacks)),
        name: z.string().min(1, getEquipmentToolingValidationMessage(t, 'equipmentTooling.molds.dialog.validation.nameRequired', moldValidationFallbacks)),
        maxCycles: z.number().min(1, getEquipmentToolingValidationMessage(t, 'equipmentTooling.molds.dialog.validation.maxCyclesPositive', moldValidationFallbacks)),
        currentCycles: z.number().default(0),
        maintenanceThreshold: z.number().min(1, getEquipmentToolingValidationMessage(t, 'equipmentTooling.molds.dialog.validation.maintenanceThresholdPositive', moldValidationFallbacks)),
        totalLifeCycles: z.number().default(0),
        groupName: z.string().optional(),
        status: moldStatusSchema,
        location: z.string().optional(),
        description: z.string().optional(),
        isAlerted: z.boolean().default(false),
        lastCheckedAt: z.string().optional(),
        imageUrl: z.string().optional(),
        version: z.number().default(1),
        createdAt: z.string(),
        createdBy: z.string().optional(),
        updatedBy: z.string().optional(),
        updatedAt: z.string().optional(),
    })
}

export function createFurnaceSchema(t?: EquipmentToolingTranslate) {
    return z.object({
        id: z.string(),
        sn: z.string().min(1, getEquipmentToolingValidationMessage(t, 'equipmentTooling.furnaces.dialog.validation.snRequired', furnaceValidationFallbacks)),
        name: z.string().min(1, getEquipmentToolingValidationMessage(t, 'equipmentTooling.furnaces.dialog.validation.nameRequired', furnaceValidationFallbacks)),
        type: z.string().min(1, getEquipmentToolingValidationMessage(t, 'equipmentTooling.furnaces.dialog.validation.typeRequired', furnaceValidationFallbacks)),
        maxTemp: z.number().min(1, getEquipmentToolingValidationMessage(t, 'equipmentTooling.furnaces.dialog.validation.maxTempPositive', furnaceValidationFallbacks)),
        currentTemp: z.number(),
        imageUrl: z.string().optional(),
        version: z.number().default(1),
        status: furnaceStatusSchema,
        location: z.string().optional(),
        description: z.string().optional(),
        createdAt: z.string(),
        createdBy: z.string().optional(),
        updatedBy: z.string().optional(),
        updatedAt: z.string().optional(),
    })
}

export function createEquipmentPartnerSchema(t?: EquipmentToolingTranslate) {
    return z.object({
        id: z.string(),
        name: z.string().min(1, getEquipmentToolingValidationMessage(t, 'equipmentTooling.partners.validation.nameRequired', partnerValidationFallbacks)),
        type: z.enum(['INTERNAL', 'EXTERNAL']),
        contactPerson: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        version: z.number().default(1),
        createdAt: z.string(),
    })
}

export function createMoldDrawingSchema(t?: EquipmentToolingTranslate) {
    return z.object({
        id: z.string(),
        moldId: z.string().optional(),
        moldSn: z.string().optional(),
        name: z.string().min(1, getEquipmentToolingValidationMessage(t, 'equipmentTooling.drawings.validation.nameRequired', drawingValidationFallbacks)),
        type: z.enum(['2D', '3D', 'TECH_SPEC', 'OTHER']),
        fileUrl: z.string().min(1, getEquipmentToolingValidationMessage(t, 'equipmentTooling.drawings.validation.fileRequired', drawingValidationFallbacks)),
        version: z.string().default('V1.0'),
        sysVersion: z.number().default(1),
        status: z.enum(['ACTIVE', 'DRAFT', 'OBSOLETE']).default('ACTIVE'),
        uploadedAt: z.string(),
        remarks: z.string().optional(),
    })
}

export const moldSchema = createMoldSchema()
export const furnaceSchema = createFurnaceSchema()
export const equipmentPartnerSchema = createEquipmentPartnerSchema()
export const moldDrawingSchema = createMoldDrawingSchema()

export type MoldFormInput = z.input<ReturnType<typeof createMoldSchema>>
export type MoldFormOutput = z.output<ReturnType<typeof createMoldSchema>>
export type FurnaceFormInput = z.input<ReturnType<typeof createFurnaceSchema>>
export type FurnaceFormOutput = z.output<ReturnType<typeof createFurnaceSchema>>

export function createMoldDraft(overrides: Partial<MoldFormOutput> = {}): MoldFormOutput {
    return {
        id: '',
        sn: '',
        name: '',
        maxCycles: 1000,
        currentCycles: 0,
        maintenanceThreshold: 800,
        totalLifeCycles: 0,
        groupName: '',
        status: 'IDLE',
        location: '',
        description: '',
        isAlerted: false,
        imageUrl: '',
        version: 1,
        createdAt: new Date().toISOString(),
        ...overrides,
    }
}

export function createFurnaceDraft(defaultType: string, overrides: Partial<FurnaceFormOutput> = {}): FurnaceFormOutput {
    return {
        id: '',
        sn: '',
        name: '',
        type: defaultType,
        maxTemp: 1200,
        currentTemp: 25,
        version: 1,
        status: 'IDLE',
        location: '',
        description: '',
        imageUrl: '',
        createdAt: new Date().toISOString(),
        ...overrides,
    }
}

export const moldLoanSchema = z.object({
    id: z.string(),
    moldId: z.string(),
    moldSn: z.string(),
    moldName: z.string(),
    fromFactory: z.string(),
    toFactory: z.string(),
    contactPerson: z.string(),
    loanDate: z.string(),
    expectedReturnDate: z.string(),
    actualReturnDate: z.string().optional(),
    status: z.enum(['ACTIVE', 'RETURNED', 'OVERDUE']),
    remarks: z.string().optional(),
    photoUrl: z.string().optional(),
    // 借入模式下的资产初始化元数据
    maxCycles: z.number().optional(),
    currentCycles: z.number().optional(),
    maintenanceThreshold: z.number().optional(),
    version: z.number().default(1),
    createdAt: z.string(),
})

export type Mold = z.infer<typeof moldSchema>
export type MoldStatus = z.infer<typeof moldStatusSchema>
export type Furnace = z.infer<typeof furnaceSchema>
export type FurnaceStatus = z.infer<typeof furnaceStatusSchema>
export type MoldLoan = z.infer<typeof moldLoanSchema>
export type MoldLoanStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE'
export type EquipmentPartner = z.infer<typeof equipmentPartnerSchema>
export type MoldDrawing = z.infer<typeof moldDrawingSchema>

export const moldDrawingLogSchema = z.object({
    id: z.string(),
    drawingId: z.string(),
    action: z.enum(['CREATED', 'BIND', 'UNBIND', 'STATUS_CHANGE', 'VERSION_UPDATE']),
    details: z.string(),
    delta: z.record(z.string(), z.any()).optional(),
    operator: z.string().default('SYSTEM'),
    timestamp: z.string(),
})

export type MoldDrawingLog = z.infer<typeof moldDrawingLogSchema>
