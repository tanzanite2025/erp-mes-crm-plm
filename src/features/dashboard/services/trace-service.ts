import { PrintRecordService } from '../../print-mgmt/services/print-record-service'
import { getSalesOrders } from '../../trading/services/trading-service'

export interface TraceStats {
    wip: number
    scrap: number
    scrapDelta: number
    gapOrders: number
    gapDescription: string
    totalSn: number 
    productionFunnel: { name: string, value: number }[]
}

export const TraceService = {
    /**
     * 获取仪表盘统计数据 (已对接真实后端订单)
     */
    async getDashboardStats(): Promise<TraceStats> {
        // 1. 获取销售订单数据
        const orders = await getSalesOrders();
        const today = new Date();
        const warningThreshold = new Date();
        warningThreshold.setDate(today.getDate() + 3); // 3天预警期

        // 2. 识别风险订单 (待处理/生产中 且 逾期/临期)
        const riskyOrders = orders.items.filter(order => {
            if (['Done', 'Canceled', 'Draft'].includes(order.status)) return false;
            
            const deliveryDate = new Date(order.deliveryDate);
            const isNearOrOverdue = deliveryDate <= warningThreshold;
            
            // 检查明细行是否完全交付
            const hasGap = order.lines.some(line => (line.deliveredQty || 0) < line.qty);
            
            return isNearOrOverdue && hasGap;
        });

        const overdueCount = riskyOrders.filter(o => new Date(o.deliveryDate) < today).length;
        const nearDueCount = riskyOrders.length - overdueCount;

        let description = '暂无交付缺口预警';
        if (riskyOrders.length > 0) {
            description = `${overdueCount} 张订单已逾期，${nearDueCount} 张即将到期`;
        }

        // 3. 计算生产漏斗数据 (基于订单行真实状态)
        const funnel = [
            { 
                name: 'pending', 
                value: orders.items.filter(o => o.status === 'Pending').length 
            },
            { 
                name: 'inprogress', 
                value: orders.items.filter(o => o.status === 'InProgress').length 
            },
            { 
                name: 'done', 
                value: orders.items.filter(o => o.status === 'Done').length 
            },
            { 
                name: 'delivered', 
                value: orders.items.reduce((total, order) => {
                    const deliveredSum = order.lines?.reduce((sum, line) => sum + (line.deliveredQty || 0), 0) || 0;
                    return total + (deliveredSum > 0 ? 1 : 0); // 这里统计至少有一单交付的订单数，或者根据业务需求改为总件数
                }, 0)
            }
        ];

        return {
            wip: orders.items.filter(o => o.status === 'InProgress').length, 
            scrap: await PrintRecordService.getScrapCount(),
            scrapDelta: 0,
            gapOrders: riskyOrders.length,
            gapDescription: description,
            totalSn: await PrintRecordService.getTotalActivatedCount(),
            productionFunnel: funnel
        }
    }
}
