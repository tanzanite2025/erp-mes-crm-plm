import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { type LogisticsRecord, type LogisticsStatus, type LogisticsEvent } from '../types'

const logger = createLogger('LogisticsService')

class LogisticsService {
    /**
     * 获取物流记录 (已支持分页)
     */
    async getRecords(page = 1, pageSize = 50): Promise<{ items: LogisticsRecord[], total: number }> {
        return apiFetch<{ items: LogisticsRecord[], total: number }>(`/logistics?page=${page}&pageSize=${pageSize}`)
    }

    /**
     * 获取单条物流详情
     */
    async getRecordById(id: string): Promise<LogisticsRecord | undefined> {
        try {
            return await apiFetch<LogisticsRecord>(`/logistics/${id}`)
        } catch (error) {
            logger.error(`[FAIL_LOUDLY] LogisticsService.getRecordById(${id})`, error)
            return undefined
        }
    }

    /**
     * 按订单号获取物流记录
     */
    async getRecordsByOrderNo(orderNo: string): Promise<LogisticsRecord[]> {
        return apiFetch<LogisticsRecord[]>(`/logistics?orderNo=${encodeURIComponent(orderNo)}`)
    }

    /**
     * 保存或更新物流记录 (后端驱动)
     */
    async saveRecord(data: Partial<LogisticsRecord>): Promise<LogisticsRecord> {
        // 后端逻辑：如果带有 ID 则更新，否则创建
        return apiFetch<LogisticsRecord>('/logistics', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    }

    /**
     * 更新物流状态并追加事件 (原子化更新)
     */
    async updateStatus(id: string, status: LogisticsStatus, location: string, description: string): Promise<LogisticsRecord> {
        // 先获取当前记录以获取事件流
        const record = await this.getRecordById(id)
        if (!record) throw new Error('Record not found')

        const now = new Date().toISOString()
        const newEvent: LogisticsEvent = {
            id: '',
            time: now,
            location,
            description,
            status
        }

        // 解析并追加
        let currentEvents: LogisticsEvent[] = []
        if (record.events) {
            try {
                currentEvents = typeof record.events === 'string' 
                    ? JSON.parse(record.events) 
                    : (Array.isArray(record.events) ? record.events : [])
            } catch (e) {
                logger.error('Failed to parse events', e)
                currentEvents = []
            }
        }

        const updatedEvents = [newEvent, ...currentEvents]

        return apiFetch<LogisticsRecord>(`/logistics/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
                status,
                location,
                description,
                events: updatedEvents, // 直接传数组，apiFetch 会序列化为 JSON 数组
                version: record.version // 传递乐观锁版本
            })
        })
    }

    /**
     * 逻辑删除记录
     */
    async deleteRecord(id: string): Promise<void> {
        await apiFetch(`/logistics/${id}`, {
            method: 'DELETE'
        })
    }
}

export const logisticsService = new LogisticsService()
