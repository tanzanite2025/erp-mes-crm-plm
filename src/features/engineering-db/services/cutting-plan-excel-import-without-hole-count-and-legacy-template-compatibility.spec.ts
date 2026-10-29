import ExcelJS, { type Workbook } from 'exceljs'
import { describe, expect, it, vi } from 'vitest'
import { normalizeCutSizeUnit } from '@/features/raw-materials/cut-size-library/data/cut-size-library-schema'
import { generateCuttingPlanImportTemplate } from './cutting-plan-excel-exporter'
import { parseCuttingPlanImportExcel } from './cutting-plan-excel-parser'

const capturedWorkbookDownload = vi.hoisted(() => ({
  workbook: undefined as Workbook | undefined,
}))

vi.mock('@/lib/excel/export', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/excel/export')>()),
  downloadWorkbook: vi.fn(async (workbook: Workbook) => {
    capturedWorkbookDownload.workbook = workbook
  }),
}))

const cutSizeUnit = normalizeCutSizeUnit({
  id: 'cut-size-1',
  code: 'CUT-100',
  name: '标准裁片',
  widthMm: '100',
  lengthMm: '200',
})
const currentImportRowValues = [
  1,
  'DOC-1',
  'A1',
  '2026-10-26',
  'R50-SKU',
  'R50',
  'T700',
  'RESIN-1',
  '35%',
  '1',
  '45°',
  'CUT-100',
  '铺层说明',
  '#BREAK',
  'Active',
]

async function serializeCuttingPlanImportWorkbookAsFile(
  workbook: Workbook
): Promise<File> {
  const buffer = await workbook.xlsx.writeBuffer()
  const bytes = new Uint8Array(buffer)
  return {
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer,
  } as File
}

describe('cutting plan Excel import without hole count and legacy compatibility', () => {
  it('exports a template without hole count and imports its material and cutting columns correctly', async () => {
    await generateCuttingPlanImportTemplate()
    const workbook = capturedWorkbookDownload.workbook!
    const sheet = workbook.getWorksheet(1)!
    expect(sheet.columnCount).toBe(15)
    expect(sheet.getRow(1).values).not.toContain('孔数*')
    expect(sheet.getRow(3).getCell(14).dataValidation.formulae).toEqual([
      '"#BREAK,BREAK,分组,分割,黄条"',
    ])
    expect(sheet.getRow(3).getCell(15).dataValidation.formulae).toEqual([
      '"Draft,Active,Archived"',
    ])
    sheet.getRow(3).values = currentImportRowValues

    const imported = await parseCuttingPlanImportExcel(
      await serializeCuttingPlanImportWorkbookAsFile(workbook),
      [cutSizeUnit]
    )
    expect(imported).toMatchObject({
      name: 'R50-裁纱单',
      carbonFiberModel: 'T700',
      resinModel: 'RESIN-1',
      resinContentPercent: '35%',
      status: 'Active',
    })
    expect(imported).not.toHaveProperty('holeCount')
    expect(imported.lines[0]).toMatchObject({
      cutSizeId: 'cut-size-1',
      rollOrder: '1',
      yarnDirection: '45°',
      operationNote: '铺层说明',
      manualGroupBreakBefore: true,
    })
  })

  it.each(['', '24'])(
    'ignores the legacy hole-count column with value "%s" without shifting cutting fields',
    async (legacyHoleCount) => {
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('CUTTING_PLAN_IMPORT')
      sheet.getRow(1).getCell(7).value = '孔数*'
      sheet.getRow(3).values = [
        ...currentImportRowValues.slice(0, 6),
        legacyHoleCount,
        ...currentImportRowValues.slice(6),
      ]
      const imported = await parseCuttingPlanImportExcel(
        await serializeCuttingPlanImportWorkbookAsFile(workbook),
        [cutSizeUnit]
      )
      expect(imported).not.toHaveProperty('holeCount')
      expect(imported).toMatchObject({
        name: 'R50-裁纱单',
        carbonFiberModel: 'T700',
        resinModel: 'RESIN-1',
        resinContentPercent: '35%',
        status: 'Active',
      })
      expect(imported.lines[0]).toMatchObject({
        cutSizeId: 'cut-size-1',
        rollOrder: '1',
        yarnDirection: '45°',
        operationNote: '铺层说明',
        manualGroupBreakBefore: true,
      })
    }
  )
})
