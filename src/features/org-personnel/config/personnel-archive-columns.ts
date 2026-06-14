import { type TranslationKey } from '@/locales'
import { type Employee } from '../data/schema'

export type PersonnelArchiveColumnKey =
  | 'serialNo'
  | 'staffId'
  | 'name'
  | 'deptId'
  | 'position'
  | 'phone'
  | 'emergencyPhone'
  | 'gender'
  | 'joinedDate'
  | 'workYears'
  | 'status'
  | 'age'
  | 'idCard'
  | 'birthday'
  | 'address'
  | 'bankCard'
  | 'bankName'
  | 'education'

export type PersonnelArchiveColumn = {
  key: PersonnelArchiveColumnKey
  header: TranslationKey
  width: number
  required?: boolean
  importable?: boolean
  type?: 'list'
  options?: string[]
}

export type PersonnelSelectOption = {
  label: string
  value: string
}

export const PERSONNEL_ARCHIVE_COLUMNS: PersonnelArchiveColumn[] = [
  { key: 'serialNo', header: 'orgPersonnel.excel.columns.serialNo', width: 10 },
  {
    key: 'staffId',
    header: 'orgPersonnel.excel.columns.staffId',
    width: 16,
    required: true,
    importable: true,
  },
  {
    key: 'name',
    header: 'orgPersonnel.excel.columns.name',
    width: 14,
    required: true,
    importable: true,
  },
  {
    key: 'deptId',
    header: 'orgPersonnel.excel.columns.deptId',
    width: 18,
    required: true,
    importable: true,
  },
  {
    key: 'position',
    header: 'orgPersonnel.excel.columns.position',
    width: 18,
    importable: true,
  },
  {
    key: 'phone',
    header: 'orgPersonnel.excel.columns.phone',
    width: 18,
    importable: true,
  },
  {
    key: 'emergencyPhone',
    header: 'orgPersonnel.excel.columns.emergencyPhone',
    width: 20,
    importable: true,
  },
  {
    key: 'gender',
    header: 'orgPersonnel.excel.columns.gender',
    width: 10,
    importable: true,
    type: 'list',
    options: ['男', '女'],
  },
  {
    key: 'joinedDate',
    header: 'orgPersonnel.excel.columns.joinedDate',
    width: 14,
    importable: true,
  },
  {
    key: 'workYears',
    header: 'orgPersonnel.excel.columns.workYears',
    width: 14,
  },
  {
    key: 'status',
    header: 'orgPersonnel.excel.columns.status',
    width: 12,
    importable: true,
    type: 'list',
    options: ['active', 'resigned', 'on-leave'],
  },
  {
    key: 'age',
    header: 'orgPersonnel.excel.columns.age',
    width: 10,
    importable: true,
  },
  {
    key: 'idCard',
    header: 'orgPersonnel.excel.columns.idCard',
    width: 24,
    importable: true,
  },
  {
    key: 'birthday',
    header: 'orgPersonnel.excel.columns.birthday',
    width: 14,
    importable: true,
  },
  {
    key: 'address',
    header: 'orgPersonnel.excel.columns.address',
    width: 28,
    importable: true,
  },
  {
    key: 'bankCard',
    header: 'orgPersonnel.excel.columns.bankCard',
    width: 24,
    importable: true,
  },
  {
    key: 'bankName',
    header: 'orgPersonnel.excel.columns.bankName',
    width: 24,
    importable: true,
  },
  {
    key: 'education',
    header: 'orgPersonnel.excel.columns.education',
    width: 12,
    importable: true,
    type: 'list',
    options: ['初中', '高中', '中专', '大专', '本科', '硕士', '博士'],
  },
]

export const PERSONNEL_TEMPLATE_COLUMNS = PERSONNEL_ARCHIVE_COLUMNS

export const PERSONNEL_TEMPLATE_SHEET_NAME =
  'orgPersonnel.excel.templateSheetName'
export const PERSONNEL_EXPORT_SHEET_NAME = 'orgPersonnel.excel.exportSheetName'
export const PERSONNEL_ALLOWED_IMPORT_SHEET_NAMES = [
  '人员档案导入模板',
  '人员档案导出',
  'orgPersonnel.excel.templateSheetName',
  'orgPersonnel.excel.exportSheetName',
] as const

export const PERSONNEL_IMPORT_COLUMNS = PERSONNEL_TEMPLATE_COLUMNS.filter(
  (column) => column.importable
)

export const PERSONNEL_FORM_FIELD_KEYS = [
  'staffId',
  'name',
  'deptId',
  'phone',
  'emergencyPhone',
  'gender',
  'joinedDate',
  'status',
  'age',
  'idCard',
  'birthday',
  'address',
  'bankCard',
  'bankName',
  'education',
] as const satisfies ReadonlyArray<PersonnelArchiveColumnKey>

export type PersonnelFormFieldKey = (typeof PERSONNEL_FORM_FIELD_KEYS)[number]

export type PersonnelFormFieldConfig = {
  key: PersonnelFormFieldKey
  input: 'text' | 'date' | 'number' | 'select'
  placeholder: string
  span?: 1 | 2
  defaultValue?: string
  required?: boolean
  options?: PersonnelSelectOption[]
  optionSource?: 'department'
  formValueFromEmployee?: (employee: Employee) => string
  submitValueFromForm?: (value: string) => unknown
}

export function getPersonnelColumnConfig(key: PersonnelArchiveColumnKey) {
  return PERSONNEL_ARCHIVE_COLUMNS.find((column) => column.key === key)
}

type PersonnelTranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getPersonnelColumnLabel(
  key: PersonnelArchiveColumnKey,
  t?: PersonnelTranslateFn
): string {
  const headerKey = getPersonnelColumnConfig(key)?.header
  if (!headerKey) {
    return key
  }
  return t ? t(headerKey) : headerKey
}

function buildColumnOptions(
  key: PersonnelArchiveColumnKey
): PersonnelSelectOption[] {
  return (getPersonnelColumnConfig(key)?.options ?? []).map((option) => ({
    label: option,
    value: option,
  }))
}

export const PERSONNEL_STATUS_OPTIONS: PersonnelSelectOption[] = [
  { label: 'orgPersonnel.excel.statuses.active', value: 'active' },
  { label: 'orgPersonnel.excel.statuses.resigned', value: 'resigned' },
  { label: 'orgPersonnel.excel.statuses.onLeave', value: 'on-leave' },
]

export const PERSONNEL_FORM_FIELDS: PersonnelFormFieldConfig[] = [
  {
    key: 'staffId',
    input: 'text',
    placeholder: '例如：4080102',
    required: true,
  },
  {
    key: 'name',
    input: 'text',
    placeholder: '例如：张三',
    required: true,
  },
  {
    key: 'deptId',
    input: 'select',
    placeholder: '请选择部门',
    required: true,
    optionSource: 'department',
  },
  {
    key: 'phone',
    input: 'text',
    placeholder: '13800000000',
  },
  {
    key: 'emergencyPhone',
    input: 'text',
    placeholder: '紧急联系人电话',
  },
  {
    key: 'gender',
    input: 'select',
    placeholder: '请选择性别',
    defaultValue: '男',
    options: buildColumnOptions('gender'),
  },
  {
    key: 'joinedDate',
    input: 'date',
    placeholder: '',
    formValueFromEmployee: (employee) =>
      formatPersonnelDate(employee.joinedDate),
    submitValueFromForm: (value) =>
      value ? new Date(value).toISOString() : null,
  },
  {
    key: 'status',
    input: 'select',
    placeholder: '请选择在职情况',
    defaultValue: 'active',
    options: PERSONNEL_STATUS_OPTIONS,
  },
  {
    key: 'age',
    input: 'number',
    placeholder: '例如：28',
    formValueFromEmployee: (employee) =>
      employee.age !== undefined && employee.age !== null
        ? String(employee.age)
        : '',
    submitValueFromForm: (value) => (value ? Number(value) : undefined),
  },
  {
    key: 'idCard',
    input: 'text',
    placeholder: '18位身份证号码',
  },
  {
    key: 'birthday',
    input: 'date',
    placeholder: '',
    formValueFromEmployee: (employee) => formatPersonnelDate(employee.birthday),
    submitValueFromForm: (value) =>
      value ? new Date(value).toISOString() : null,
  },
  {
    key: 'bankCard',
    input: 'text',
    placeholder: '工资卡号',
  },
  {
    key: 'bankName',
    input: 'text',
    placeholder: '例如：中国工商银行',
  },
  {
    key: 'education',
    input: 'select',
    placeholder: '请选择学历',
    options: buildColumnOptions('education'),
  },
  {
    key: 'address',
    input: 'text',
    placeholder: '详细家庭住址',
    span: 2,
  },
]

export function normalizePersonnelHeader(value: string): string {
  if (!value) return ''
  return String(value)
    .replace(/[\s\n\r]/g, '')
    .toLowerCase()
}

export function formatPersonnelDate(value?: string | null): string {
  if (!value || value.startsWith('0001')) return ''
  return value.split('T')[0]
}

export function getPersonnelStatusLabel(
  status?: string,
  t?: PersonnelTranslateFn
): string {
  if (status === 'resigned')
    return t ? t('orgPersonnel.excel.statuses.resigned') : 'resigned'
  if (status === 'on-leave')
    return t ? t('orgPersonnel.excel.statuses.onLeave') : 'on-leave'
  return t ? t('orgPersonnel.excel.statuses.active') : 'active'
}

/**
 * [UI-PREVIEW-VALUE]: 前端工龄计算仅用于 UI 即时展示反馈
 * [BACKEND-AUTHORITY]: 权威工龄核算属于后端 PersonnelService/BRP 范畴，涉及节假日、入职节点及特殊政策。
 */
export function previewPersonnelWorkYears(joinedDate?: string | null): string {
  const normalized = formatPersonnelDate(joinedDate)
  if (!normalized) return ''

  const start = new Date(normalized)
  if (Number.isNaN(start.getTime())) return ''

  const now = new Date()
  const diffYears =
    (now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  if (diffYears < 0) return ''

  const rounded = Math.round(diffYears * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function getPersonnelArchiveValue(
  employee: Employee,
  columnKey: PersonnelArchiveColumnKey,
  rowIndex: number,
  nameMap: Record<string, string>
): string | number {
  switch (columnKey) {
    case 'serialNo':
      return rowIndex + 1
    case 'deptId':
      return employee.deptId && nameMap[employee.deptId]
        ? nameMap[employee.deptId]
        : employee.deptId || ''
    case 'position':
      return employee.positionName || employee.positionId || ''
    case 'joinedDate':
      return formatPersonnelDate(employee.joinedDate)
    case 'workYears':
      return previewPersonnelWorkYears(employee.joinedDate)
    case 'status':
      return getPersonnelStatusLabel(employee.status)
    case 'birthday':
      return formatPersonnelDate(employee.birthday)
    case 'age':
      return employee.age ?? ''
    case 'staffId':
    case 'name':
    case 'phone':
    case 'emergencyPhone':
    case 'gender':
    case 'idCard':
    case 'address':
    case 'bankCard':
    case 'bankName':
    case 'education':
      return employee[columnKey] || ''
    default:
      return ''
  }
}
