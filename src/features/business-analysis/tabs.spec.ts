import { describe, expect, it } from 'vitest'
import { getBusinessAnalysisDomain, getBusinessAnalysisTabs } from './tabs'

const translate = (key: string) => key

describe('business analysis domain tabs', () => {
  it('projects only production tabs for production routes', () => {
    expect(
      getBusinessAnalysisTabs(
        translate,
        getBusinessAnalysisDomain('/business-analysis/production-load')
      ).map((tab) => tab.href)
    ).toEqual([
      '/business-analysis/production-capacity',
      '/business-analysis/production-load',
      '/business-analysis/production-efficiency',
    ])
  })

  it('projects only quality tabs for quality routes', () => {
    expect(
      getBusinessAnalysisTabs(
        translate,
        getBusinessAnalysisDomain('/business-analysis/defect-trend')
      ).map((tab) => tab.href)
    ).toEqual(['/business-analysis/scrap', '/business-analysis/defect-trend'])
  })

  it('projects only customer and sales tabs for customer routes', () => {
    expect(
      getBusinessAnalysisTabs(
        translate,
        getBusinessAnalysisDomain('/business-analysis/customers')
      ).map((tab) => tab.href)
    ).toEqual(['/business-analysis/orders', '/business-analysis/customers'])
  })

  it('does not fall back to another domain for an unmapped route', () => {
    expect(getBusinessAnalysisDomain('/business-analysis')).toBeUndefined()
    expect(getBusinessAnalysisTabs(translate, undefined)).toEqual([])
  })
})
