import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CutSizeUnit } from '@/features/raw-materials/cut-size-library/data/cut-size-library-schema'
import { parseCuttingPlanImportExcel } from './cutting-plan-excel-parser'

const workbookLoadMock = vi.fn()
const getWorksheetMock = vi.fn()

vi.mock('@/lib/lazy-vendors', () => ({
  loadExcelJS: async () => ({
    default: {
      Workbook: class {
        worksheets = [{}]

        xlsx = {
          load: workbookLoadMock,
        }

        getWorksheet = getWorksheetMock
      },
    },
  }),
}))

function createCell(value: string) {
  return { value }
}

function createRow(cells: Record<number, string>) {
  return {
    getCell: (index: number) => createCell(cells[index] || ''),
  }
}

const CUT_SIZE_UNIT: CutSizeUnit = {
  id: 'cut-size-1',
  code: 'CS-001',
  name: '主纱 980x34x4',
  widthMm: '980',
  lengthMm: '34',
  pieceCount: '4',
  areaM2: '0.13328',
  areaWeightGsm: '260',
  weightG: '34.6528',
  cutAngle: '45',
  layupCount: '1',
  layupMode: '',
  usageType: '主纱',
  edgeTrimMm: '',
  stepOffsetMm: '',
  lossFactor: '',
  notes: '',
  status: 'Active',
  version: 1,
}

describe('parseCuttingPlanImportExcel', () => {
  beforeEach(() => {
    workbookLoadMock.mockReset()
    workbookLoadMock.mockResolvedValue(undefined)
    getWorksheetMock.mockReset()
  })

  it('requires cut-size library codes instead of freeform size expressions', async () => {
    getWorksheetMock.mockReturnValue({
      eachRow: (callback: (row: ReturnType<typeof createRow>, rowNumber: number) => void) => {
        callback(
          createRow({
            2: 'DOC-001',
            3: 'A1',
            5: 'P-001',
            6: '产品A',
            7: '14',
            11: '1',
            12: 'C0',
            13: '',
            14: '备注',
            15: '',
            16: 'Draft',
          }),
          3,
        )
      },
    })

    const file = new File(['demo'], 'cutting-plan.xlsx')

    await expect(parseCuttingPlanImportExcel(file, [CUT_SIZE_UNIT])).rejects.toThrow(
      '第 3 行缺少“尺寸库编码”，无法导入。',
    )
  })

  it('imports rows by active cut-size library code and syncs authority snapshots', async () => {
    getWorksheetMock.mockReturnValue({
      eachRow: (callback: (row: ReturnType<typeof createRow>, rowNumber: number) => void) => {
        callback(
          createRow({
            2: 'DOC-001',
            3: 'A1',
            5: 'P-001',
            6: '产品A',
            7: '14',
            11: '1',
            12: 'C0',
            13: 'CS-001',
            14: '备注',
            15: '',
            16: 'Draft',
          }),
          3,
        )
      },
    })

    const file = new File(['demo'], 'cutting-plan.xlsx')
    const result = await parseCuttingPlanImportExcel(file, [CUT_SIZE_UNIT])

    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].cutSizeId).toBe('cut-size-1')
    expect(result.lines[0].cutSizeCode).toBe('CS-001')
    expect(result.lines[0].sizeExpression).toBe('980x34x4')
    expect(result.lines[0].faw).toBe('260')
    expect(result.lines[0].weightG).toBe('34.6528')
    expect(result.lines[0].areaM2).toBe('0.13328')
  })
})
