import { describe, expect, it } from 'vitest'
import { type TranslationKey } from '@/locales'
import { getEmployeeFormSchema } from './employee-action-dialog.shared'

const translate = (key: TranslationKey) => key

describe('employee action dialog form schema', () => {
  it('preserves edit metadata needed by the patch save path', () => {
    const parsed = getEmployeeFormSchema(translate).parse({
      id: 'employee-1',
      version: 7,
      staffId: '7250800003',
      name: '陈艳萍',
      orgUnitId: 'org-1',
      phone: '',
      emergencyPhone: '',
      gender: '女',
      joinedDate: '',
      status: 'active',
      age: '0',
      idCard: '',
      birthday: '',
      address: '',
      bankCard: '',
      bankName: '',
      education: '',
      positionId: '',
    })

    expect(parsed.version).toBe(7)
  })
})
