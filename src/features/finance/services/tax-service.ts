import { apiFetch } from '@/lib/api-client'
import { type DeltaSet, type DeltaPayload } from '@/lib/delta/types'
import { buildVersionedPatchMetadata } from '@/lib/version-guard'
import { type TaxRate } from '../data/taxation'

const TAX_RATE_PATCH_INTENT_SAVE = 'TAX_RATE_PATCH_SAVE'

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

  /**
   * 局部更新税率 (SDRTS 协议)
   */
  async patchTaxRate(
    id: string,
    delta: DeltaSet,
    version: number
  ): Promise<TaxRate> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: buildVersionedPatchMetadata(
        id,
        version,
        'TaxService.patchTaxRate',
        {
          intent: TAX_RATE_PATCH_INTENT_SAVE,
        }
      ),
    }

    return apiFetch<TaxRate>(`/finance/tax-rates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  }

  /**
   * @deprecated [PREVIEW-ONLY] 前端价税计算逻辑已弃用。
   * 警告：财务类数据的税额计算必须由后端根据税务引擎规则处理并回填，以确保精度和合法性一致。
   */
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
