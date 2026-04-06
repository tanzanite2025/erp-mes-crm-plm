import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Factory, Warehouse, Truck, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * XDFC MRP 可视化卡片节点 (Custom Node)
 * 遵循 ERP UDS 1.0 工业视觉规范
 */

const IconMap = {
  box: Box,
  factory: Factory,
  warehouse: Warehouse,
  truck: Truck,
  'check-circle': CheckCircle,
  alert: AlertCircle,
};

export const MRPNode = memo(({ data }: any) => {
  const Icon = IconMap[data.icon as keyof typeof IconMap] || Box;

  // 状态语义映射
  const statusStyles = {
    PRIMARY: 'bg-primary/10 border-primary text-primary',
    HEALTHY: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600',
    ALERT: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
    CRITICAL: 'bg-rose-500/10 border-rose-500/30 text-rose-600 animate-pulse',
  };

  const currentStyle = statusStyles[data.status as keyof typeof statusStyles] || statusStyles.PRIMARY;

  return (
    <div className={cn(
      "min-w-[220px] p-4 rounded-[24px] border-dashed border shadow-sm backdrop-blur-sm transition-all hover:shadow-lg",
      currentStyle
    )}>
      {/* 顶部状态标识 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
            <Icon size={16} className="opacity-80" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                {data.label || 'Inventory Node'}
            </span>
        </div>
        {data.status === 'CRITICAL' && <AlertCircle size={14} className="text-rose-500" />}
      </div>

      {/* 主标题 - 强斜体工业风 */}
      <div className="mb-2">
        <h4 className="text-sm font-black tracking-tighter italic uppercase truncate">
          {data.title || 'Unknown Item'}
        </h4>
        <p className="text-[9px] font-black tracking-widest opacity-60 uppercase">
          {data.subtitle || '-'}
        </p>
      </div>

      {/* 数据元信息 */}
      <div className="flex items-end justify-between mt-4">
        <div>
           {data.date && (
             <div className="text-[8px] font-mono opacity-50 mb-1">{data.date}</div>
           )}
           <div className="flex items-baseline gap-1">
             <span className="text-lg font-black tracking-tighter">{data.quantity}</span>
             <span className="text-[10px] font-black uppercase opacity-60">{data.unit}</span>
           </div>
        </div>
        
        <div className="h-2 w-2 rounded-full bg-current opacity-20 shadow-[0_0_8px_rgba(0,0,0,0.1)]" />
      </div>

      {/* 连接端口 */}
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-current !border-none opacity-40" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-current !border-none opacity-40" />
    </div>
  );
});

MRPNode.displayName = 'MRPNode';

/**
 * 分配处理器节点 (Router Node)
 * 极简圆形设计，用于多路径分流
 */
export const RouterNode = memo(() => (
  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-2xl border-4 border-background ring-2 ring-primary/20">
    <div className="w-1 h-1 rounded-full bg-background animate-ping" />
    <Handle type="target" position={Position.Left} className="w-0 h-0 !opacity-0" />
    <Handle type="source" position={Position.Right} className="w-0 h-0 !opacity-0" />
    <Handle type="source" position={Position.Top} className="w-0 h-0 !opacity-0" />
    <Handle type="source" position={Position.Bottom} className="w-0 h-0 !opacity-0" />
  </div>
));

RouterNode.displayName = 'RouterNode';
