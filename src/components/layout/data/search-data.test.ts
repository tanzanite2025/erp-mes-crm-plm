import { describe, expect, it } from 'vitest'
import {
  ENABLED_ACTION_RESULT_IDS,
  STATIC_SEARCH_RESULT_REGISTRY,
  getSearchItems,
} from './search-data'

const t = (key: string) => key

describe('getSearchItems', () => {
  it('restores only the explicitly whitelisted material, product, inbound, customer, employee, and sales-order actions', () => {
    const items = getSearchItems(t as never)
    const actionItems = items.filter((item) => item.category === 'actions')
    const materialCreateAction = actionItems.find(
      (item) => item.id === 'action-add-material'
    )
    const productCreateAction = actionItems.find(
      (item) => item.id === 'action-add-product'
    )
    const inboundAction = actionItems.find(
      (item) => item.id === 'action-inbound'
    )
    const customerCreateAction = actionItems.find(
      (item) => item.id === 'action-add-customer'
    )
    const employeeCreateAction = actionItems.find(
      (item) => item.id === 'action-add-employee'
    )
    const salesOrderCreateAction = actionItems.find(
      (item) => item.id === 'action-create-sales-order'
    )
    const enabledActionIds = STATIC_SEARCH_RESULT_REGISTRY.actions
      .filter((item) => item.enabled)
      .map((item) => item.id)

    expect(ENABLED_ACTION_RESULT_IDS).toEqual([
      'action-add-material',
      'action-add-product',
      'action-inbound',
      'action-add-customer',
      'action-add-employee',
      'action-create-sales-order',
    ])
    expect(actionItems).toHaveLength(6)
    expect(materialCreateAction).toBeDefined()
    expect(materialCreateAction?.title).toBe(
      'materialArchive.upsertDialog.createTitle'
    )
    expect(materialCreateAction?.parentTitle).toBe(
      'materialArchive.layout.title'
    )
    expect(materialCreateAction?.href).toBe('/materials?action=add')
    expect(materialCreateAction?.keywords).toEqual(
      expect.arrayContaining([
        'materialArchive.upsertDialog.createTitle',
        'materialArchive.layout.title',
        '登记档案',
        '登记新物料',
        '物料档案',
        '物料资源中心',
      ])
    )
    expect(productCreateAction).toBeDefined()
    expect(productCreateAction?.title).toBe(
      'commandMenu.items.addProduct'
    )
    expect(productCreateAction?.parentTitle).toBe(
      'commandMenu.parents.engineeringManagement'
    )
    expect(productCreateAction?.href).toBe('/engineering/products?action=add')
    expect(productCreateAction?.keywords).toEqual(
      expect.arrayContaining([
        'commandMenu.items.addProduct',
        'commandMenu.parents.engineeringManagement',
        '创建型号',
        '新增产品',
      ])
    )
    expect(productCreateAction?.keywords).not.toContain('bom')
    expect(inboundAction).toBeDefined()
    expect(inboundAction?.title).toBe(
      'commandMenu.items.inboundAction'
    )
    expect(inboundAction?.parentTitle).toBe(
      'commandMenu.parents.warehouse'
    )
    expect(inboundAction?.href).toBe('/warehouse/inbound?action=add')
    expect(customerCreateAction).toBeDefined()
    expect(customerCreateAction?.title).toBe(
      'commandMenu.items.addCustomer'
    )
    expect(customerCreateAction?.parentTitle).toBe(
      'commandMenu.parents.salesManagement'
    )
    expect(customerCreateAction?.href).toBe('/trading/customers?action=add')
    expect(employeeCreateAction).toBeDefined()
    expect(employeeCreateAction?.title).toBe(
      'commandMenu.items.addEmployee'
    )
    expect(employeeCreateAction?.parentTitle).toBe(
      'commandMenu.parents.employeeManagement'
    )
    expect(employeeCreateAction?.href).toBe('/personnel/employees?action=add')
    expect(salesOrderCreateAction).toBeDefined()
    expect(salesOrderCreateAction?.title).toBe(
      'commandMenu.items.createSalesOrder'
    )
    expect(salesOrderCreateAction?.parentTitle).toBe(
      'commandMenu.parents.salesManagement'
    )
    expect(salesOrderCreateAction?.href).toBe(
      '/trading/sales-orders?action=create'
    )
    expect(STATIC_SEARCH_RESULT_REGISTRY.actions.length).toBeGreaterThan(0)
    expect(enabledActionIds).toEqual([
      'action-add-material',
      'action-add-product',
      'action-add-customer',
      'action-create-sales-order',
      'action-inbound',
      'action-add-employee',
    ])
  })

  it('keeps module search results available while quick actions are gated off', () => {
    const items = getSearchItems(t as never)
    const materialsTab = items.find((item) => item.id === 'tab-materials')

    expect(materialsTab).toBeDefined()
    expect(materialsTab?.href).toBe('/materials')
    expect(materialsTab?.keywords).toEqual(
      expect.arrayContaining(['物料主数据', 'material', 'archive'])
    )
  })
})
