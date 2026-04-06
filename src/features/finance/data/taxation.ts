export interface TaxRate {
    id: string
    name: string        // 描述 (如：增值税-成品销项)
    code: string        // 识别码 (如：VAT13)
    rate: number        // 税率百分比 (如：13)
    status: 'Active' | 'Inactive'
    description?: string
}

export const defaultTaxRates: TaxRate[] = [
    {
        id: 'tax_vat_13',
        name: '',
        code: 'VAT13',
        rate: 13,
        status: 'Active',
        description: ''
    },
    {
        id: 'tax_vat_9',
        name: '',
        code: 'VAT9',
        rate: 9,
        status: 'Active',
        description: ''
    },
    {
        id: 'tax_vat_6',
        name: '',
        code: 'VAT6',
        rate: 6,
        status: 'Active',
        description: ''
    },
    {
        id: 'tax_vat_0',
        name: '',
        code: 'VAT0',
        rate: 0,
        status: 'Active',
        description: ''
    }
]
