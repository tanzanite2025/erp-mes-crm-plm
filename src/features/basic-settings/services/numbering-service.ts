import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('NumberingService')

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
            const data = await apiFetch<{ number: string }>(`/numbering/generate?ruleKey=${ruleKey}`)
            if (!data?.number) {
                throw new Error(`[NUMBERING_ERROR] Unexpected response: ruleKey=${ruleKey}`)
            }
            return data.number
        } catch (error) {
            logger.error('Cloud numbering generation failed', error)
            throw error
        }
    }

    async generateContractBarcode(classificationAlias: string, entityCode: string = 'ZP6A'): Promise<string> {
        const ruleKey = `CONTRACT_${entityCode}_${classificationAlias}`
        return this.generateNumber(ruleKey)
    }

    async previewContractBarcode(classificationAlias: string, entityCode: string = 'ZP6A'): Promise<string> {
        const now = new Date()
        const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`
        return `${entityCode}${classificationAlias}${yymm}****`
    }

    previewSequence(padding: number = 4): string {
        return '*'.repeat(Math.max(1, padding))
    }
}

export const numberingService = new NumberingService()
