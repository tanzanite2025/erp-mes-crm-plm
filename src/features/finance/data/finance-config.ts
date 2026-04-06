export type CurrencyCode = 'CNY' | 'USD' | 'EUR' | 'HKD' | 'JPY' | 'GBP'

export interface CurrencyConfig {
    code: CurrencyCode
    symbol: string
    rate: number // 汇率，相对于本位币 (CNY)
    precision: number
}

export const currencies: CurrencyConfig[] = [
    { code: 'CNY', symbol: '¥', rate: 1, precision: 2 },
    { code: 'USD', symbol: '$', rate: 7.24, precision: 2 },
    { code: 'EUR', symbol: '€', rate: 7.85, precision: 2 },
    { code: 'HKD', symbol: 'HK$', rate: 0.92, precision: 2 },
]

export interface PaymentTerm {
    id: string
    code: string
    isDefault?: boolean
    // 后续扩展分期逻辑
    installments?: { percentage: number; delayDays: number }[]
}

export const paymentTerms: PaymentTerm[] = [
    { 
        id: 'pt_cod', 
        code: 'COD', 
        isDefault: true 
    },
    { 
        id: 'pt_full_pre', 
        code: 'PREPAY', 
    },
    { 
        id: 'pt_30_60_10', 
        code: 'INST_30_60_10', 
        installments: [
            { percentage: 30, delayDays: 0 },
            { percentage: 60, delayDays: 30 },
            { percentage: 10, delayDays: 365 }
        ]
    },
    { 
        id: 'pt_net_30', 
        code: 'NET30', 
    }
]

/**
 * 汇率计算辅助函数
 */
export const convertToBase = (amount: number, fromCurrency: CurrencyCode): number => {
    const currency = currencies.find(c => c.code === fromCurrency)
    if (!currency) return amount
    return amount * currency.rate
}

export const formatCurrency = (amount: number, code: CurrencyCode): string => {
    const currency = currencies.find(c => c.code === code)
    if (!currency) return amount.toString()
    return `${currency.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: currency.precision })}`
}
