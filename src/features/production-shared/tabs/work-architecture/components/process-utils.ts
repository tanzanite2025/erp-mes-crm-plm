import { productionResourceService } from '@/features/production-shared/services/production-resource-service'

export interface ProcessStep {
    id: string
    code: string
    name: string
    description: string
    sortOrder: number
    isActive: boolean
    createdAt: string
    updatedAt?: string
}

export async function getStoredProcesses(): Promise<ProcessStep[]> {
    return productionResourceService.getSteps()
}
