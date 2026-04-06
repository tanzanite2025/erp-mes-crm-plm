import { apiFetch } from '@/lib/api-client'
import { type TaxRate } from '../data/taxation'

class TaxService {
  async getTaxRates(): Promise<TaxRate[]> {
    return apiFetch<TaxRate[]>('/finance/tax-rates')
  }

  async saveTaxRate(rate: TaxRate): Promise<TaxRate> {
    return apiFetch<TaxRate>('/finance/tax-rates', {
      method: 'POST',
      body: JSON.stringify(rate),
    })
  }

  calculateFromTotal(totalAmount: number, taxRate: number) {
    const rateDecimal = taxRate / 100
    const amountExclTax = totalAmount / (1 + rateDecimal)
    const taxAmount = totalAmount - amountExclTax
    return {
      amountExclTax: Number(amountExclTax.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
    }
  }
}

export const taxService = new TaxService()
export type { TaxRate }
