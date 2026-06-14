import { apiFetch } from '@/lib/api-client'
import { ensureArrayField, ensureObjectResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'
import { type NumberingRule } from '../data/schema'

const logger = createLogger('NumberingService')

function normalizeNumberingRule(input: Record<string, unknown>): NumberingRule {
  return {
    id: typeof input.id === 'string' ? input.id : undefined,
    ruleKey: String(input.ruleKey ?? '').trim(),
    prefix: typeof input.prefix === 'string' ? input.prefix : undefined,
    pattern: String(input.pattern ?? '').trim(),
    currentSeq: Number(input.currentSeq ?? 0),
    padding: Number(input.padding ?? 4),
    resetPeriod: (String(input.resetPeriod ?? 'MONTHLY').trim() ||
      'MONTHLY') as NumberingRule['resetPeriod'],
    lastReset:
      typeof input.lastReset === 'string' ? input.lastReset : undefined,
  }
}

class NumberingService {
  private isInitialized = false

  async init() {
    if (this.isInitialized) return
    this.isInitialized = true
    logger.info('Service initialized (Cloud Mode).')
  }

  async generateNumber(ruleKey: string): Promise<string> {
    if (!this.isInitialized) await this.init()

    try {
      const res = await apiFetch<{ number: string }>(
        `/numbering/generate?ruleKey=${ruleKey}`
      )
      const data = ensureObjectResponse<
        { number?: string } & Record<string, unknown>
      >(res, 'NumberingService.generateNumber')
      if (!data.number) {
        throw new Error(
          `[NUMBERING_ERROR] Unexpected response: ruleKey=${ruleKey}`
        )
      }
      return data.number
    } catch (error) {
      logger.error('Cloud numbering generation failed', error)
      throw error
    }
  }

  async generateContractBarcode(
    classificationAlias: string,
    entityCode: string = 'ZP6A'
  ): Promise<string> {
    const ruleKey = `CONTRACT_${entityCode}_${classificationAlias}`
    return this.generateNumber(ruleKey)
  }

  async previewContractBarcode(
    classificationAlias: string,
    entityCode: string = 'ZP6A'
  ): Promise<string> {
    const now = new Date()
    const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`
    return `${entityCode}${classificationAlias}${yymm}****`
  }

  async getRules(): Promise<NumberingRule[]> {
    if (!this.isInitialized) await this.init()

    try {
      const res = await apiFetch<
        Record<string, unknown> | Record<string, unknown>[]
      >('/numbering/rules')
      if (Array.isArray(res)) {
        return res.map((item) => normalizeNumberingRule(item))
      }

      const payload = ensureObjectResponse(res, 'NumberingService.getRules')
      return ensureArrayField<Record<string, unknown>>(
        payload,
        'items',
        'NumberingService.getRules.items'
      ).map(normalizeNumberingRule)
    } catch (error) {
      logger.error('Failed to load numbering rules', error)
      throw error
    }
  }

  async saveRule(input: Partial<NumberingRule>): Promise<void> {
    if (!this.isInitialized) await this.init()

    try {
      await apiFetch('/numbering/rules', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    } catch (error) {
      logger.error('Failed to save numbering rule', error)
      throw error
    }
  }

  previewSequence(padding: number = 4): string {
    return '*'.repeat(Math.max(1, padding))
  }
}

export const numberingService = new NumberingService()
