import { type AppLocale, type TranslationKey, translate } from '@/locales'
import { loadExcelJS } from '@/lib/lazy-vendors'

import { type Employee } from '../data/schema'
import { type OrgNode } from '../data/org-schema'
import {
    PERSONNEL_IMPORT_COLUMNS,
    PERSONNEL_TEMPLATE_COLUMNS,
    PERSONNEL_TEMPLATE_SHEET_NAME,
    PERSONNEL_EXPORT_SHEET_NAME,
    type PersonnelArchiveColumnKey,
    getPersonnelArchiveValue,
    normalizePersonnelHeader,
} from '../config/personnel-archive-columns'

const PERSONNEL_EDITABLE_ROW_COUNT = 300

type LocalizedPersonnelArchiveColumn = Omit<(typeof PERSONNEL_TEMPLATE_COLUMNS)[number], 'header'> & {
    header: string
}

type MapExcelOptions = {
    skipDeptResolution?: boolean
}

const PERSONNEL_COLUMN_TRANSLATION_KEYS: Record<PersonnelArchiveColumnKey, TranslationKey> = {
    serialNo: 'orgPersonnel.excel.columns.serialNo',
    staffId: 'orgPersonnel.excel.columns.staffId',
    name: 'orgPersonnel.excel.columns.name',
    deptId: 'orgPersonnel.excel.columns.deptId',
    position: 'orgPersonnel.excel.columns.position',
    phone: 'orgPersonnel.excel.columns.phone',
    emergencyPhone: 'orgPersonnel.excel.columns.emergencyPhone',
    gender: 'orgPersonnel.excel.columns.gender',
    joinedDate: 'orgPersonnel.excel.columns.joinedDate',
    workYears: 'orgPersonnel.excel.columns.workYears',
    status: 'orgPersonnel.excel.columns.status',
    age: 'orgPersonnel.excel.columns.age',
    idCard: 'orgPersonnel.excel.columns.idCard',
    birthday: 'orgPersonnel.excel.columns.birthday',
    address: 'orgPersonnel.excel.columns.address',
    bankCard: 'orgPersonnel.excel.columns.bankCard',
    bankName: 'orgPersonnel.excel.columns.bankName',
    education: 'orgPersonnel.excel.columns.education',
}

function getExcelColumnLetter(index: number): string {
    let result = ''
    let value = index + 1

    while (value > 0) {
        const remainder = (value - 1) % 26
        result = String.fromCharCode(65 + remainder) + result
        value = Math.floor((value - 1) / 26)
    }

    return result
}

function getPersonnelGenderLabels(locale: AppLocale) {
    return {
        male: translate(locale, 'orgPersonnel.excel.gender.male'),
        female: translate(locale, 'orgPersonnel.excel.gender.female'),
    }
}

function getPersonnelStatusLabels(locale: AppLocale) {
    return {
        active: translate(locale, 'orgPersonnel.excel.statuses.active'),
        resigned: translate(locale, 'orgPersonnel.excel.statuses.resigned'),
        onLeave: translate(locale, 'orgPersonnel.excel.statuses.onLeave'),
    }
}

function getPersonnelEducationLabels(locale: AppLocale) {
    return [
        translate(locale, 'orgPersonnel.excel.education.juniorHigh'),
        translate(locale, 'orgPersonnel.excel.education.highSchool'),
        translate(locale, 'orgPersonnel.excel.education.vocational'),
        translate(locale, 'orgPersonnel.excel.education.juniorCollege'),
        translate(locale, 'orgPersonnel.excel.education.bachelor'),
        translate(locale, 'orgPersonnel.excel.education.master'),
        translate(locale, 'orgPersonnel.excel.education.doctor'),
    ]
}

function getLocalizedPersonnelColumns(locale: AppLocale): LocalizedPersonnelArchiveColumn[] {
    const genderLabels = getPersonnelGenderLabels(locale)
    const statusLabels = getPersonnelStatusLabels(locale)
    const educationLabels = getPersonnelEducationLabels(locale)

    return PERSONNEL_TEMPLATE_COLUMNS.map((column) => ({
        ...column,
        header: translate(locale, PERSONNEL_COLUMN_TRANSLATION_KEYS[column.key]),
        options: column.key === 'gender'
            ? [genderLabels.male, genderLabels.female]
            : column.key === 'status'
                ? [statusLabels.active, statusLabels.resigned, statusLabels.onLeave]
                : column.key === 'education'
                    ? educationLabels
                    : column.options,
    }))
}

function getAllowedPersonnelSheetNames(): string[] {
    return [
        PERSONNEL_TEMPLATE_SHEET_NAME,
        PERSONNEL_EXPORT_SHEET_NAME,
        translate('zh-CN', 'orgPersonnel.excel.templateSheetName'),
        translate('zh-CN', 'orgPersonnel.excel.exportSheetName'),
        translate('en-US', 'orgPersonnel.excel.templateSheetName'),
        translate('en-US', 'orgPersonnel.excel.exportSheetName'),
    ]
}

function getPossibleHeadersForKey(key: PersonnelArchiveColumnKey): string[] {
    return Array.from(new Set([
        PERSONNEL_TEMPLATE_COLUMNS.find((column) => column.key === key)?.header || '',
        translate('zh-CN', PERSONNEL_COLUMN_TRANSLATION_KEYS[key]),
        translate('en-US', PERSONNEL_COLUMN_TRANSLATION_KEYS[key]),
    ].filter(Boolean)))
}

function parseExcelDate(value: unknown): string | null {
    if (!value) return null

    if (value instanceof Date) {
        return value.toISOString()
    }

    if (typeof value === 'number') {
        const date = new Date((value - 25569) * 86400 * 1000)
        return Number.isNaN(date.getTime()) ? null : date.toISOString()
    }

    const date = new Date(String(value))
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function normalizeStatus(value: unknown): Employee['status'] {
    const normalized = String(value || '').trim().toLowerCase()
    const zhActive = translate('zh-CN', 'orgPersonnel.excel.statuses.active').toLowerCase()
    const zhResigned = translate('zh-CN', 'orgPersonnel.excel.statuses.resigned').toLowerCase()
    const zhLeave = translate('zh-CN', 'orgPersonnel.excel.statuses.onLeave').toLowerCase()
    const enActive = translate('en-US', 'orgPersonnel.excel.statuses.active').toLowerCase()
    const enResigned = translate('en-US', 'orgPersonnel.excel.statuses.resigned').toLowerCase()
    const enLeave = translate('en-US', 'orgPersonnel.excel.statuses.onLeave').toLowerCase()

    if ([zhResigned, enResigned, 'resigned'].includes(normalized)) return 'resigned'
    if ([zhLeave, enLeave, 'on leave', 'on-leave'].includes(normalized)) return 'on-leave'
    if ([zhActive, enActive, 'active'].includes(normalized)) return 'active'
    return 'active'
}

function normalizeGender(value: unknown): string {
    const normalized = String(value || '').trim().toLowerCase()
    const zhMale = translate('zh-CN', 'orgPersonnel.excel.gender.male').toLowerCase()
    const zhFemale = translate('zh-CN', 'orgPersonnel.excel.gender.female').toLowerCase()
    const enMale = translate('en-US', 'orgPersonnel.excel.gender.male').toLowerCase()
    const enFemale = translate('en-US', 'orgPersonnel.excel.gender.female').toLowerCase()

    if ([zhFemale, enFemale, 'female', 'f'].includes(normalized)) return translate('zh-CN', 'orgPersonnel.excel.gender.female')
    if ([zhMale, enMale, 'male', 'm'].includes(normalized)) return translate('zh-CN', 'orgPersonnel.excel.gender.male')
    return String(value || '').trim()
}

function normalizeEducation(value: unknown): string {
    const raw = String(value || '').trim()
    if (!raw) return ''

    const zh = getPersonnelEducationLabels('zh-CN')
    const en = getPersonnelEducationLabels('en-US')
    const matchIndex = [...zh, ...en].findIndex((label) => label.toLowerCase() === raw.toLowerCase())
    if (matchIndex === -1) return raw
    return zh[matchIndex % zh.length]
}

function validatePersonnelSheetName(sheetName: string) {
    if (getAllowedPersonnelSheetNames().includes(sheetName)) return

    throw new Error(translate('zh-CN', 'orgPersonnel.excel.invalidSheetName', {
        sheetName,
        templateSheet: translate('zh-CN', 'orgPersonnel.excel.templateSheetName'),
        exportSheet: translate('zh-CN', 'orgPersonnel.excel.exportSheetName'),
    }))
}

function configurePersonnelWorksheet(sheet: any, rowCount: number) {
    const editableRows = Math.max(rowCount, PERSONNEL_EDITABLE_ROW_COUNT)

    PERSONNEL_TEMPLATE_COLUMNS.forEach((_, columnIndex) => {
        const headerCell = sheet.getCell(1, columnIndex + 1)
        headerCell.protection = { locked: false }

        for (let rowIndex = 2; rowIndex <= editableRows; rowIndex++) {
            const cell = sheet.getCell(rowIndex, columnIndex + 1)
            cell.protection = { locked: false }
        }
    })
}

export function validatePersonnelWorkbookStructure(rawData: Record<string, unknown>[], sheetName: string) {
    validatePersonnelSheetName(sheetName)

    if (rawData.length === 0) {
        throw new Error(translate('zh-CN', 'orgPersonnel.excel.emptyWorkbook'))
    }

    const firstRow = rawData[0]
    const expectedHeaders = new Map<string, string>()

    getLocalizedPersonnelColumns('zh-CN').forEach((column) => {
        expectedHeaders.set(normalizePersonnelHeader(column.header), column.header)
    })
    getLocalizedPersonnelColumns('en-US').forEach((column) => {
        expectedHeaders.set(normalizePersonnelHeader(column.header), column.header)
    })

    const actualHeaders = Object.keys(firstRow)
    const actualHeaderMap = new Map(actualHeaders.map((header) => [normalizePersonnelHeader(header), header]))

    const missingHeaders = PERSONNEL_TEMPLATE_COLUMNS
        .map((column) => getPossibleHeadersForKey(column.key))
        .filter((headers) => !headers.some((header) => actualHeaderMap.has(normalizePersonnelHeader(header))))
        .map((headers) => headers[0])

    const expectedHeaderSet = new Set(expectedHeaders.keys())
    const unexpectedHeaders = [...actualHeaderMap.entries()]
        .filter(([normalizedHeader]) => !expectedHeaderSet.has(normalizedHeader))
        .map(([, header]) => header)

    if (missingHeaders.length > 0 || unexpectedHeaders.length > 0) {
        const problems: string[] = []

        if (missingHeaders.length > 0) {
            problems.push(translate('zh-CN', 'orgPersonnel.excel.missingColumns', { columns: missingHeaders.join('、') }))
        }
        if (unexpectedHeaders.length > 0) {
            problems.push(translate('zh-CN', 'orgPersonnel.excel.unexpectedColumns', { columns: unexpectedHeaders.join('、') }))
        }

        throw new Error(translate('zh-CN', 'orgPersonnel.excel.structureFailed', { problems: problems.join('\n') }))
    }
}

export function generateDeptMap(nodes: OrgNode[]): Record<string, string> {
    const deptMap: Record<string, string> = {}

    const flatten = (items: OrgNode[]) => {
        items.forEach((node) => {
            if (node.name) deptMap[node.name.trim()] = node.id || ''
            if (node.children) flatten(node.children)
        })
    }

    flatten(nodes)
    return deptMap
}

export function mapExcelToEmployees(
    rawData: Record<string, unknown>[],
    deptMap: Record<string, string>,
    options: MapExcelOptions = {}
): Employee[] {
    if (rawData.length === 0) return []

    const firstRow = rawData[0]
    const headerMapping: Record<string, string> = {}
    Object.keys(firstRow).forEach((originalHeader) => {
        headerMapping[normalizePersonnelHeader(originalHeader)] = originalHeader
    })

    const seenIds = new Set<string>()
    const errors: string[] = []

    const mapped = rawData.map((row, index) => {
        const employee: Partial<Employee> & { id: string } = { id: '' }
        const lineNumber = index + 2

        PERSONNEL_IMPORT_COLUMNS.forEach((column) => {
            const actualHeader = getPossibleHeadersForKey(column.key)
                .map((header) => headerMapping[normalizePersonnelHeader(header)])
                .find(Boolean)
            const rawValue = actualHeader ? row[actualHeader] : undefined

            switch (column.key) {
                case 'staffId': {
                    const staffId = String(rawValue || '').trim()
                    if (staffId && seenIds.has(staffId)) {
                        errors.push(translate('zh-CN', 'orgPersonnel.excel.duplicateStaffId', { line: lineNumber, staffId }))
                    }
                    if (staffId) seenIds.add(staffId)
                    employee.staffId = staffId
                    break
                }
                case 'name':
                case 'phone':
                case 'idCard':
                case 'bankCard':
                case 'bankName':
                case 'address':
                case 'emergencyPhone':
                    employee[column.key] = rawValue ? String(rawValue).trim() : ''
                    break
                case 'gender':
                    employee.gender = normalizeGender(rawValue)
                    break
                case 'education':
                    employee.education = normalizeEducation(rawValue)
                    break
                case 'age': {
                    const parsed = rawValue === undefined || rawValue === null || rawValue === '' ? undefined : Number(rawValue)
                    employee.age = parsed !== undefined && !Number.isNaN(parsed) ? parsed : undefined
                    break
                }
                case 'status':
                    employee.status = normalizeStatus(rawValue)
                    break
                case 'deptId': {
                    const deptName = String(rawValue || '').trim()
                    if (!deptName) {
                        employee.deptId = ''
                        break
                    }

                    const matchedId = deptMap[deptName]
                    if (!matchedId) {
                        if (options.skipDeptResolution) {
                            employee.deptId = deptName
                        } else {
                            employee.deptId = `__UNMATCHED_DEPT:${deptName}`
                            errors.push(translate('zh-CN', 'orgPersonnel.excel.unmatchedDept', { line: lineNumber, deptName }))
                        }
                    } else {
                        employee.deptId = matchedId
                    }
                    break
                }
                case 'joinedDate':
                case 'birthday':
                    employee[column.key] = parseExcelDate(rawValue) || undefined
                    break
                default:
                    break
            }
        })

        employee.status = employee.status || 'active'
        return employee as Employee
    })

    if (errors.length > 0) {
        throw new Error(translate('zh-CN', 'orgPersonnel.excel.validationFailed', {
            details: `${errors.slice(0, 3).join('\n')}${errors.length > 3 ? translate('zh-CN', 'orgPersonnel.excel.moreErrors', { count: errors.length }) : ''}`
        }))
    }

    return mapped.filter((employee) => employee.staffId && employee.name && !String(employee.deptId).startsWith('__UNMATCHED_DEPT'))
}

function getLocalizedArchiveValue(
    employee: Employee,
    columnKey: PersonnelArchiveColumnKey,
    rowIndex: number,
    nameMap: Record<string, string>,
    locale: AppLocale
): string | number {
    const value = getPersonnelArchiveValue(employee, columnKey, rowIndex, nameMap)

    if (columnKey === 'status') {
        const statusLabels = getPersonnelStatusLabels(locale)
        if (employee.status === 'resigned') return statusLabels.resigned
        if (employee.status === 'on-leave') return statusLabels.onLeave
        return statusLabels.active
    }

    if (columnKey === 'gender') {
        const genderLabels = getPersonnelGenderLabels(locale)
        if (String(value) === translate('zh-CN', 'orgPersonnel.excel.gender.female')) return genderLabels.female
        if (String(value) === translate('zh-CN', 'orgPersonnel.excel.gender.male')) return genderLabels.male
    }

    if (columnKey === 'education') {
        const zhLabels = getPersonnelEducationLabels('zh-CN')
        const localeLabels = getPersonnelEducationLabels(locale)
        const index = zhLabels.findIndex((label) => label === String(value))
        if (index >= 0) return localeLabels[index]
    }

    return value
}

export async function downloadPersonnelTemplate(locale: AppLocale = 'zh-CN') {
    const { default: ExcelJS } = await loadExcelJS()
    const localizedColumns = getLocalizedPersonnelColumns(locale)
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet(translate(locale, 'orgPersonnel.excel.templateSheetName'), {
        views: [{ state: 'frozen', ySplit: 1 }],
    })

    sheet.columns = localizedColumns.map((column) => ({
        header: column.header,
        key: column.key,
        width: column.width,
    }))

    const headerRow = sheet.getRow(1)
    headerRow.height = 28
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

    for (let rowIndex = 2; rowIndex <= PERSONNEL_EDITABLE_ROW_COUNT; rowIndex++) {
        localizedColumns.forEach((column, columnIndex) => {
            if (column.type === 'list' && column.options?.length) {
                const cell = sheet.getCell(`${getExcelColumnLetter(columnIndex)}${rowIndex}`)
                cell.dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`"${column.options.join(',')}"`],
                }
            }
        })
    }

    const statusLabels = getPersonnelStatusLabels(locale)
    const genderLabels = getPersonnelGenderLabels(locale)
    const educationLabels = getPersonnelEducationLabels(locale)

    sheet.addRow({
        serialNo: 1,
        staffId: 'XDFC-0001',
        name: translate(locale, 'orgPersonnel.excel.sample.name'),
        deptId: translate(locale, 'orgPersonnel.excel.sample.dept'),
        position: translate(locale, 'orgPersonnel.excel.sample.position'),
        phone: '13800000000',
        emergencyPhone: '13900000000',
        gender: genderLabels.male,
        joinedDate: '2024-01-01',
        workYears: '',
        status: statusLabels.active,
        age: 28,
        idCard: '350000199601010000',
        birthday: '1996-01-01',
        address: translate(locale, 'orgPersonnel.excel.sample.address'),
        bankCard: '6222000000000000000',
        bankName: translate(locale, 'orgPersonnel.excel.sample.bankName'),
        education: educationLabels[3],
    })

    configurePersonnelWorksheet(sheet, PERSONNEL_EDITABLE_ROW_COUNT)

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = translate(locale, 'orgPersonnel.excel.templateFileName', {
        date: new Date().toLocaleDateString().replace(/\//g, '-')
    })
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
}

export async function exportPersonnelData(
    data: Employee[],
    nameMap: Record<string, string>,
    locale: AppLocale = 'zh-CN'
) {
    const { default: ExcelJS } = await loadExcelJS()
    const localizedColumns = getLocalizedPersonnelColumns(locale)
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet(translate(locale, 'orgPersonnel.excel.exportSheetName'), {
        views: [{ state: 'frozen', ySplit: 1 }],
    })

    sheet.columns = localizedColumns.map((column) => ({
        header: column.header,
        key: column.key,
        width: column.width,
    }))

    const headerRow = sheet.getRow(1)
    headerRow.height = 28
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

    data.forEach((employee, index) => {
        const row = Object.fromEntries(
            localizedColumns.map((column) => [
                column.key,
                getLocalizedArchiveValue(employee, column.key, index, nameMap, locale),
            ])
        )
        sheet.addRow(row)
    })

    configurePersonnelWorksheet(sheet, Math.max(data.length + 1, PERSONNEL_EDITABLE_ROW_COUNT))

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = translate(locale, 'orgPersonnel.excel.exportFileName', {
        date: new Date().toLocaleDateString().replace(/\//g, '-')
    })
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
}
